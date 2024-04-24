# digitalp2pbot

P2P Exchange without KYC of digital assets USDT, USDC ...

## Json type definition

https://jsontypedef.com/
https://ajv.js.org/json-type-definition.html

# Dynamo DB

Here you will find the list of commands about DynamoDB, these types of commands are ci bash command which allow you to interact with DynamoDB

## Create table

```bash
npx ts-node scripts/createTelegramUsersDBTable.ts
```

## Delete Table

```bash
npx ts-node scripts/deleteTelegramUsersDBTable.ts
```

# Things todo

1. Implement exception handle [OK].
2. Implement winston logging [OK].
3. Try to find a tool that monitoring the application.
4. Create tables using serverless framework
5. Create later with models and utilities.
6. Refactor code to have the interface in a file where the nomenclature is correct
7. Create digitalp2pbot layer
8. Method get should support field `banned`
