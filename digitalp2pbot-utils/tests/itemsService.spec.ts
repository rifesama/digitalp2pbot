import dotenv from "dotenv";
dotenv.config();
import assert, { throws } from "assert";
import { DynamoCommands, DynamoDBResponseCode } from "../src/dbCommands";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { MockSchema } from "./mocks/mockSchema";
import { faker } from "@faker-js/faker";
import createTable from "./dynamoCommands/createTable";
import deleteTable from "./dynamoCommands/deleteTable";
import { GetItemInput } from "@aws-sdk/client-dynamodb";
import { PER_PAGE } from "../src/itemsService";
import {
    ValidationError,
    DatabaseError,
    StringLengthError,
    InvalidQueryParamsError,
    ResourceNotFoundError,
} from "../src/customError";

enum DynamoDBPrefix {
    USER = "USER#",
    METADATA = "METADATA#",
    ORDER = "ORDER#",
}

describe("TestCases for DynamoDB commands", () => {
    let client: DynamoDBClient;
    let docClient: DynamoDBDocumentClient;
    const collection: string = "mockUser";
    before(async () => {
        client = new DynamoDBClient({
            region: "us-east-1",
            endpoint: process.env.DYNAMODB_ENDPOINT,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
            },
        });
        docClient = DynamoDBDocumentClient.from(client);
    });

    after(async () => {});

    beforeEach(async () => {
        await createTable(client, collection);
    });

    afterEach(async () => {
        await deleteTable(client, collection);
    });
    it("should get the schema", async () => {
        const schema = await new MockSchema(docClient, collection).getSchema();
        assert.ok(Object.keys(schema).includes("properties"));
        assert.ok(Object.keys(schema).includes("additionalProperties"));
        assert.ok(Object.keys(schema).includes("optionalProperties"));
    });

    it("should create a record on the database", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);

        const params = {
            PK: `${body.PK}`,
            SK: `${body.SK}`,
        };
        const command = new GetCommand({
            TableName: collection,
            Key: params,
        });
        const newRecord = await docClient.send(command);
        assert.ok(newRecord.$metadata.httpStatusCode);
        assert.equal(newRecord.Item?.lastName, body.lastName);
        assert.equal(newRecord.Item?.name, body.name);
        assert.equal(newRecord.Item?.phone, body.phone);
        assert.equal(newRecord.Item?.address, body.address);
        assert.ok(newRecord.Item?.active);
    });

    it("should create a record on the database using SK order", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.ORDER}1`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);

        const params = {
            PK: `${body.PK}`,
            SK: `${body.SK}`,
        };
        const command = new GetCommand({
            TableName: collection,
            Key: params,
        });
        const newRecord = await docClient.send(command);
        assert.ok(newRecord.$metadata.httpStatusCode);
        assert.equal(newRecord.Item?.lastName, body.lastName);
        assert.equal(newRecord.Item?.name, body.name);
        assert.equal(newRecord.Item?.phone, body.phone);
        assert.equal(newRecord.Item?.address, body.address);
        assert.ok(newRecord.Item?.active);
    });

    it("should create a record on the database using custom GSI", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const params = {
            PK: `${body.PK}`,
            SK: `${body.SK}`,
        };
        const command = new GetCommand({
            TableName: collection,
            Key: params,
        });
        const newRecord = await docClient.send(command);
        assert.ok(newRecord.$metadata.httpStatusCode);
        assert.equal(newRecord.Item?.lastName, body.lastName);
        assert.equal(newRecord.Item?.name, body.name);
        assert.equal(newRecord.Item?.phone, body.phone);
        assert.equal(newRecord.Item?.address, body.address);
        assert.ok(newRecord.Item?.active);
    });
    it("should create a record and use onCreate method to return it", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        const record = await schema.create(body);
        assert.equal(record?.lastName, body.lastName);
        assert.equal(record?.name, body.name);
        assert.equal(record?.phone, body.phone);
        assert.equal(record?.address, body.address);
        assert.ok(record?.active);
    });

    it("should throw an exception DatabaseError", async () => {
        const schema = await new MockSchema(docClient, "fake");
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await assert.rejects(async () => {
            await schema.create(body);
        }, DatabaseError);
    });

    it("should update the body using beforeCreate", async () => {
        class mock extends MockSchema {
            async beforeCreate(data: Record<string, any>): Promise<void> {
                data.name = "unit test";
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        const record = await schema.create(body);
        assert.equal(record?.lastName, body.lastName);
        assert.equal(record?.name, "unit test");
        assert.equal(record?.phone, body.phone);
        assert.equal(record?.address, body.address);
        assert.ok(record?.active);
    });

    it("should remove unknown fields when a record is going to be created", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
            message: "This field should be removed",
        };
        const record = await schema.create(body);
        const command = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const newRecord = await docClient.send(command);
        assert.ok(newRecord.$metadata.httpStatusCode);
        assert.equal(newRecord.Item?.message, undefined);
        assert.equal(record?.message, undefined);
    });

    it("should raise error when the field does not have the correct type", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: 12,
            address: faker.location.streetAddress(),
            active: true,
        };
        await assert.rejects(async () => {
            await schema.create(body);
        }, ValidationError);
    });

    it("should raise string length error validation data", async () => {
        class mock extends MockSchema {
            async validateData(data: Record<string, any>): Promise<void> {
                if (data.name == "unit test") {
                    throw new StringLengthError("name", 1, 10);
                }
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "unit test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await assert.rejects(
            async () => {
                await schema.create(body);
            },
            StringLengthError,
            "name must be between 1 and 10 characters long."
        );
    });
    it("should update the name and active fields of the record in the database", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const commandBeforeUpdate = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const recordBeforeUpdate = await docClient.send(commandBeforeUpdate);
        const data = { name: "new name", active: false };
        await schema.update({ PK: body.PK, SK: body.SK }, data);
        const command = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const recordUpdated = await docClient.send(command);
        assert.ok(recordUpdated.$metadata.httpStatusCode);
        assert.equal(recordUpdated.Item?.name, "new name");
        assert.equal(recordUpdated.Item?.active, false);
        assert.ok(
            recordUpdated.Item?.updatedAt >= recordBeforeUpdate.Item?.updatedAt
        );
    });

    it("should update the name and active fields checking response using on update", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const data = { name: "new name", active: false };
        const recordUpdate = await schema.update(
            { PK: body.PK, SK: body.SK },
            data
        );
        assert.equal(recordUpdate?.name, data.name);
        assert.equal(recordUpdate?.active, data.active);
    });
    it("should update the  name using the method beforeUpdate", async () => {
        class mock extends MockSchema {
            async beforeUpdate(
                record: Record<string, any>,
                data: Record<string, any>
            ): Promise<void> {
                data.name = "unit test";
                record.active = false;
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const data = { lastName: "new name" };
        const recordUpdate = await schema.update(
            { PK: body.PK, SK: body.SK },
            data
        );
        assert.equal(recordUpdate?.name, "unit test");
        assert.equal(recordUpdate?.active, false);
        assert.equal(recordUpdate?.lastName, data.lastName);
    });
    it.skip("should update the query using the method beforeUpdateSetQuery", async () => {
        class mock extends MockSchema {
            async beforeUpdateSetQuery(
                query: Record<string, any>
            ): Promise<void> {
                query.phone = "00000000";
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: "00000000",
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const data = { lastName: "new name" };
        const recordUpdate = await schema.update(
            { PK: body.PK, SK: body.SK },
            data
        );
        assert.equal(recordUpdate?.name, "unit test");
        assert.equal(recordUpdate?.active, false);
        assert.equal(recordUpdate?.lastName, data.lastName);
    });
    it("should list all records in the database usin scan command", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const query = { name: "test" };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length >= 1);
    });

    it("should list all records in the database usin query command", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const query = { name: "test", PK: body.PK, SK: body.SK };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 1);
    });

    it("should list records and return specifics fields", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const query = { name: "test", PK: body.PK, SK: body.SK };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
            fields: ["createdAt", "phone", "lastName"],
        });
        assert.ok(items.length == 1);
        assert.equal(items[0].name, undefined);
        assert.equal(items[0].phone, body.phone);
        assert.equal(items[0].lastName, body.lastName);
    });

    it("should list records and update the query using before load", async () => {
        class mock extends MockSchema {
            async beforeLoad(
                query: Record<string, any>,
                rawQuery: Record<string, any>,
                fields: string[],
                sort: Record<string, any> = { createdAt: -1 }
            ): Promise<{
                query: Record<string, any>;
                fields: string[];
                sort: Record<string, any>;
            }> {
                query.name = "new";
                return { query, fields, sort };
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        body.name = "new";
        await schema.create(body);
        const { items, lastEvaluatedKey } = await schema.load({
            query: {},
            rawQuery: {},
        });
        assert.ok(items.length == 1);
        assert.equal(items[0].name, "new");
    });

    it("should list records and use index createdAt", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        body.name = "new2";
        await schema.create(body);
        const { items, lastEvaluatedKey } = await schema.load({});
        assert.ok(items.length == 2);
    });

    it("should filter without keyExpression and sort by createdAt", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        body.name = "new";
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const query = { name: "new" };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 2);
    });

    it("should filter using keyExpression and sort by createdAt", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        body.name = "new";
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const query = { name: "new", PK: body.PK, SK: body.SK };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 1);
    });

    it("should filter using GSI and sort by createdAt", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        body.name = "new";
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const query = { name: "new" };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 2);
    });

    it("should list all the orders for the specific user", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        for (let i = 0; i < 10; i++) {
            const body = {
                PK: `${DynamoDBPrefix.USER}${uuid}`,
                SK: `${DynamoDBPrefix.ORDER}${i}`,
                name: "test",
                lastName: faker.person.lastName(),
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
                active: true,
            };
            await schema.create(body);
        }
        const query = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK_PREFIX: "ORDER#",
        };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 10);
    });

    it("should list all the orders order by createdAt", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        for (let i = 0; i < 10; i++) {
            const body = {
                PK: `${DynamoDBPrefix.USER}${uuid}`,
                SK: `${DynamoDBPrefix.ORDER}${i}`,
                name: "test",
                lastName: faker.person.lastName(),
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
                active: true,
            };
            await schema.create(body);
        }
        const query = {};
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 10);
    });
    it("should list all the orders with metadata for a specific user", async () => {
        const schema = await new MockSchema(docClient, collection);
        for (let i = 0; i < 10; i++) {
            const uuid = faker.string.uuid();
            const body = {
                PK: `${DynamoDBPrefix.ORDER}${i}`,
                SK: `${DynamoDBPrefix.METADATA}${i}`,
                name: `test${i}`,
                lastName: faker.person.lastName(),
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
                active: true,
            };
            await schema.create(body);
        }
        const query = {
            name: "test7",
            PK: `${DynamoDBPrefix.ORDER}7`,
            SK: `${DynamoDBPrefix.METADATA}7`,
        };
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        assert.ok(items.length == 1);
    });
    it("should get one record using loadOne method", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const item = await schema.loadOne({ PK: body.PK, SK: body.SK });
        assert.equal(item.name, body.name);
        assert.equal(item.lastName, body.lastName);
        assert.equal(item.phone, body.phone);
        assert.equal(item.address, body.address);
        assert.equal(item.active, body.active);
    });

    it("should get one record using loadOne and specific fields", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const item = await schema.loadOne({ PK: body.PK, SK: body.SK }, [
            "name",
            "lastName",
        ]);
        assert.equal(item.name, body.name);
        assert.equal(item.lastName, body.lastName);
        assert.equal(item.phone, undefined);
        assert.equal(item.address, undefined);
        assert.equal(item.active, undefined);
    });

    it("should paginate the items", async () => {
        const schema = await new MockSchema(docClient, collection);
        for (let i = 0; i < 110; i++) {
            const body = {
                PK: `${DynamoDBPrefix.USER}${i}`,
                SK: `${DynamoDBPrefix.METADATA}${i}`,
                name: faker.person.firstName(),
                lastName: faker.person.lastName(),
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
                active: true,
            };
            await schema.create(body);
        }
        const query = {};
        const { items, lastEvaluatedKey } = await schema.load({
            query: query,
            rawQuery: query,
        });
        const totalItems = await schema.count(query);
        assert.equal(totalItems, 110);
        assert.ok(items.length == PER_PAGE);
    });
    it("should get one record using loadOne and use beforeLoadOne", async () => {
        class mock extends MockSchema {
            async beforeLoadOne(
                query: Record<string, any>,
                fields: string[] = []
            ): Promise<{ query: Record<string, any>; fields: string[] }> {
                fields = ["name"];
                query.PK = `${DynamoDBPrefix.USER}123`;
                query.SK = `${DynamoDBPrefix.METADATA}123`;
                return { query, fields };
            }
        }
        const schema = await new mock(docClient, collection);
        const body = {
            PK: `${DynamoDBPrefix.USER}123`,
            SK: `${DynamoDBPrefix.METADATA}123`,
            name: "test",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const item = await schema.loadOne();
        assert.equal(item.name, body.name);
        assert.equal(item.lastName, undefined);
        assert.equal(item.phone, undefined);
        assert.equal(item.address, undefined);
        assert.equal(item.active, undefined);
    });

    it("should get one record using loadOne and use onLoadOne", async () => {
        class mock extends MockSchema {
            async onLoadOne(
                item: Record<string, any>
            ): Promise<Record<string, any>> {
                item["name"] = "this is a test";
                return item;
            }
        }
        const schema = await new mock(docClient, collection);
        const body = {
            PK: `${DynamoDBPrefix.USER}123`,
            SK: `${DynamoDBPrefix.METADATA}123`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const item = await schema.loadOne({ PK: body.PK, SK: body.SK });
        assert.equal(item.name, "this is a test");
        assert.equal(item.lastName, body.lastName);
        assert.equal(item.phone, item.phone);
        assert.equal(item.address, item.address);
        assert.equal(item.active, item.active);
    });

    it("should raise the exception when the query sent is empty", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        await assert.rejects(async () => {
            await schema.loadOne();
        }, InvalidQueryParamsError);
    });

    it("should raise the exception resource not found load one", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        await assert.rejects(async () => {
            await schema.loadOne({ PK: "123773737", SK: "123773737" });
        }, ResourceNotFoundError);
    });

    it("should delete one item using the method delete", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const deleteResult = await schema.delete({ PK: body.PK, SK: body.SK });

        const command = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const { Item } = await docClient.send(command);
        assert.equal(Item, undefined);
        assert.equal(
            deleteResult.$metadata.httpStatusCode,
            DynamoDBResponseCode.Ok
        );
    });
    it("should delete one item using the method delete and before delete set criteria", async () => {
        class mock extends MockSchema {
            async beforeDeleteSetCriteria(
                query: Record<string, any>
            ): Promise<void> {
                query.PK = `${DynamoDBPrefix.USER}88`;
                query.SK = `${DynamoDBPrefix.METADATA}88`;
            }
        }
        const schema = await new mock(docClient, collection);
        const body = {
            PK: `${DynamoDBPrefix.USER}88`,
            SK: `${DynamoDBPrefix.METADATA}88`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const deleteResult = await schema.delete();
        const command = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const { Item } = await docClient.send(command);
        assert.equal(Item, undefined);
        assert.equal(
            deleteResult.$metadata.httpStatusCode,
            DynamoDBResponseCode.Ok
        );
    });
    it("should delete one item using the methods delete and before delete", async () => {
        class mock extends MockSchema {
            async beforeDelete(
                item: Record<string, any>,
                query: Record<string, any>
            ): Promise<void> {
                assert.equal(item.Id, query.Id);
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const deleteResult = await schema.delete({ PK: body.PK, SK: body.SK });
        const command = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const { Item } = await docClient.send(command);
        assert.equal(Item, undefined);
        assert.equal(
            deleteResult.$metadata.httpStatusCode,
            DynamoDBResponseCode.Ok
        );
    });
    it("should delete one item using the methods delete and on delete", async () => {
        class mock extends MockSchema {
            async onDelete(item: Record<string, any>): Promise<void> {
                assert.equal(item.active, true);
            }
        }
        const schema = await new mock(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        const deleteResult = await schema.delete({ PK: body.PK, SK: body.SK });
        const command = new GetCommand({
            TableName: collection,
            Key: { PK: body.PK, SK: body.SK },
        });
        const { Item } = await docClient.send(command);
        assert.equal(Item, undefined);
        assert.equal(
            deleteResult.$metadata.httpStatusCode,
            DynamoDBResponseCode.Ok
        );
    });

    it("should raise invalid query params error when the query param is empty", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);

        await assert.rejects(async () => {
            await schema.delete();
        }, InvalidQueryParamsError);
    });

    it("should raise resource not found error when the query param is empty", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);

        await assert.rejects(async () => {
            await schema.delete({ PK: "88", SK: "88" });
        }, ResourceNotFoundError);
    });

    it("should count the records using filter expression", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "count",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        body.name = "test";
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const count = await schema.count({ name: "count" });
        assert.equal(count, 2);
    });

    it("should return the count of all records when the query is empty", async () => {
        const schema = await new MockSchema(docClient, collection);
        const uuid = faker.string.uuid();
        const body = {
            PK: `${DynamoDBPrefix.USER}${uuid}`,
            SK: `${DynamoDBPrefix.METADATA}${uuid}`,
            name: "count",
            lastName: faker.person.lastName(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            active: true,
        };
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        body.PK = `${DynamoDBPrefix.USER}${faker.string.uuid()}`;
        body.SK = `${DynamoDBPrefix.METADATA}${faker.string.uuid()}`;
        await schema.create(body);
        const count = await schema.count({});
        assert.equal(count, 3);
    });
});
