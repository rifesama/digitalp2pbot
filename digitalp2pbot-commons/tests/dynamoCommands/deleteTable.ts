import { DynamoDBClient, DeleteTableCommand } from "@aws-sdk/client-dynamodb";

export default async function deleteTable(
  docClient: DynamoDBClient,
  tableName: string,
) {
  try {
    const command = new DeleteTableCommand({
      TableName: tableName,
    });
    await docClient.send(command);
  } catch (error) {
    console.error("Error Deleting Table:", error);
  }
}
