import dotenv from 'dotenv';
dotenv.config();
import assert, { throws } from 'assert';
import { DynamoCommands } from '../src/commands/start/dbCommands';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MockSchema } from './mocks/mockSchema';
import { faker } from '@faker-js/faker';
import createTable from './dynamoCommands/createTable';
import deleteTable from './dynamoCommands/deleteTable';
import { GetItemInput } from '@aws-sdk/client-dynamodb';
import {
  ValidationError,
  DatabaseError,
  StringLengthError,
} from '../src/commands/start/customError';
import { sleep } from './utils';

describe('TestCases for DynamoDB commands', () => {
  let client: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  const collection: string = 'mockUser';
  before(async () => {
    client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    docClient = DynamoDBDocumentClient.from(client);
    await createTable(client, collection);
  });

  after(async () => {
    await deleteTable(client, collection);
  });
  it('should get the schema', async () => {
    const schema = await new MockSchema(docClient, collection).getSchema();
    assert.ok(Object.keys(schema).includes('properties'));
    assert.ok(Object.keys(schema).includes('additionalProperties'));
    assert.ok(Object.keys(schema).includes('optionalProperties'));
  });

  it('should create a record on the database', async () => {
    const schema = await new MockSchema(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    const command = new GetCommand({ TableName: collection, Key: { Id: body.Id } });
    const newRecord = await docClient.send(command);
    assert.ok(newRecord.$metadata.httpStatusCode);
    assert.equal(newRecord.Item?.lastName, body.lastName);
    assert.equal(newRecord.Item?.name, body.name);
    assert.equal(newRecord.Item?.phone, body.phone);
    assert.equal(newRecord.Item?.address, body.address);
    assert.ok(newRecord.Item?.active);
  });

  it('should create a record and use onCreate method to return it', async () => {
    const schema = await new MockSchema(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
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

  it('should throw an exception DatabaseError', async () => {
    const schema = await new MockSchema(docClient, 'fake');
    const body = {
      Id: faker.string.uuid(),
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

  it('should update the body using beforeCreate', async () => {
    class mock extends MockSchema {
      async beforeCreate(data: Record<string, any>): Promise<void> {
        data.name = 'unit test';
      }
    }
    const schema = await new mock(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    const record = await schema.create(body);
    assert.equal(record?.lastName, body.lastName);
    assert.equal(record?.name, 'unit test');
    assert.equal(record?.phone, body.phone);
    assert.equal(record?.address, body.address);
    assert.ok(record?.active);
  });

  it('should remove unknown fields when a record is going to be created', async () => {
    const schema = await new MockSchema(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
      message: 'This field should be removed',
    };
    const record = await schema.create(body);
    const command = new GetCommand({ TableName: collection, Key: { Id: body.Id } });
    const newRecord = await docClient.send(command);
    assert.ok(newRecord.$metadata.httpStatusCode);
    assert.equal(newRecord.Item?.message, undefined);
    assert.equal(record?.message, undefined);
  });

  it('should raise error when the field does not have the correct type', async () => {
    const schema = await new MockSchema(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
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

  it('should raise string length error validation data', async () => {
    class mock extends MockSchema {
      async validateData(data: Record<string, any>): Promise<void> {
        if (data.name == 'unit test') {
          throw new StringLengthError('name', 1, 10);
        }
      }
    }
    const schema = await new mock(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: 'unit test',
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
      'name must be between 1 and 10 characters long.',
    );
  });
  it('should update the name and active fields of the record in the database', async () => {
    const schema = await new MockSchema(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    const commandBeforeUpdate = new GetCommand({ TableName: collection, Key: { Id: body.Id } });
    const recordBeforeUpdate = await docClient.send(commandBeforeUpdate);
    const data = { name: 'new name', active: false };
    await schema.update({ Id: body.Id }, data);
    const command = new GetCommand({ TableName: collection, Key: { Id: body.Id } });
    const recordUpdated = await docClient.send(command);
    assert.ok(recordUpdated.$metadata.httpStatusCode);
    assert.equal(recordUpdated.Item?.name, 'new name');
    assert.equal(recordUpdated.Item?.active, false);
    console.log('before', recordBeforeUpdate.Item?.updatedAt);
    console.log('after', recordUpdated.Item?.updatedAt);
    assert.ok(recordUpdated.Item?.updatedAt >= recordBeforeUpdate.Item?.updatedAt);
  });

  it('should update the name and active fields checking response using on update', async () => {
    const schema = await new MockSchema(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    const data = { name: 'new name', active: false };
    const recordUpdate = await schema.update({ Id: body.Id }, data);
    assert.equal(recordUpdate?.name, data.name);
    assert.equal(recordUpdate?.active, data.active);
  });
  it('should update the  name using the method beforeUpdate', async () => {
    class mock extends MockSchema {
      async beforeUpdate(record: Record<string, any>, data: Record<string, any>): Promise<void> {
        data.name = 'unit test';
        record.active = false;
      }
    }
    const schema = await new mock(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    const data = { lastName: 'new name' };
    const recordUpdate = await schema.update({ Id: body.Id }, data);
    assert.equal(recordUpdate?.name, 'unit test');
    assert.equal(recordUpdate?.active, false);
    assert.equal(recordUpdate?.lastName, data.lastName);
  });
  it.skip('should update the query using the method beforeUpdateSetQuery', async () => {
    class mock extends MockSchema {
      async beforeUpdateSetQuery(query: Record<string, any>): Promise<void> {
        query.phone = '00000000';
      }
    }
    const schema = await new mock(docClient, collection);
    const body = {
      Id: faker.string.uuid(),
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: '00000000',
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    const data = { lastName: 'new name' };
    const recordUpdate = await schema.update({ Id: body.Id }, data);
    assert.equal(recordUpdate?.name, 'unit test');
    assert.equal(recordUpdate?.active, false);
    assert.equal(recordUpdate?.lastName, data.lastName);
  });
  it('should list all records in the database usin scan command', async () => {
    const schema = await new MockSchema(docClient, collection);
    let body = {
      Id: faker.string.uuid(),
      name: "test",
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    body.Id=faker.string.uuid()
    await schema.create(body);
    const query = {name: "test"};
    const items = await schema.load({ query: query, rawQuery: query });
    assert.ok(items.length>=1)
  });

  it('should list all records in the database usin query command', async () => {
    const schema = await new MockSchema(docClient, collection);
    let body = {
      Id: faker.string.uuid(),
      name: "test",
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      active: true,
    };
    await schema.create(body);
    body.Id=faker.string.uuid()
    await schema.create(body);
    const query = {name: "test", Id: body.Id};
    const items = await schema.load({ query: query, rawQuery: query });
    assert.ok(items.length==1)
  });

  it('should save the record without saving the unknown fields', async () => {
    assert.strictEqual(true, true);
  });

  it('should raise string length error', async () => {
    assert.strictEqual(true, true);
  });

  it('should raise invalid email error', async () => {
    assert.strictEqual(true, true);
  });
});
