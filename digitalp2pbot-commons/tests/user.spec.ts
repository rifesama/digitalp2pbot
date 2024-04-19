import dotenv from "dotenv";
dotenv.config();
import assert from "assert";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { StatusCodes } from "http-status-codes";
import createTable from "./dynamoCommands/createTable";
import deleteTable from "./dynamoCommands/deleteTable";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import i18n from "../libs/i18n";
import { User } from "../models/user";
import { DynamoTablePrefix } from "../libs/dynamoConstants";
import { ValidationError } from "digitalp2pbot-utils";

describe("TestCases for digitalp2pbot users model", () => {
  let client: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  const collection: string = process.env.TABLE_NAME as string;
  before(async () => {
    await i18n.changeLanguage("es");
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

  beforeEach(async () => {
    await createTable(client, collection);
  });

  afterEach(async () => {
    await deleteTable(client, collection);
  });

  it("should raise error username is required", async () => {
    const user = new User(docClient, i18n);
    const payload = {
      PK: faker.string.uuid(),
      firstName: faker.person.firstName(),
    };
    await assert.rejects(
      async () => {
        await user.updateItem(payload);
      },
      {
        name: "ValidationError",
        message: i18n.t("non_handle_error"),
      },
    );
  });
});
