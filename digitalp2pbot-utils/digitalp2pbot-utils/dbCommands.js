"use strict";
var _DynamoCommands_collectionKeyName;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoCommands = exports.DynamoDBResponseCode = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const customError_1 = require("./customError");
var DynamoDBResponseCode;
(function (DynamoDBResponseCode) {
    DynamoDBResponseCode[DynamoDBResponseCode["Ok"] = 200] = "Ok";
})(DynamoDBResponseCode || (exports.DynamoDBResponseCode = DynamoDBResponseCode = {}));
class DynamoCommands {
    constructor(dbClient, collection) {
        _DynamoCommands_collectionKeyName.set(this, 'Id');
        this.dbClient = dbClient;
        this.collection = collection;
    }
    getKeySchemas() {
        return ['PK', 'SK', 'SK_PREFIX'];
    }
    getKeyExpression(filter) {
        const queryCopy = { ...filter };
        const keyExpression = this.getKeySchemas().reduce((acc, field) => {
            if (queryCopy.hasOwnProperty(field)) {
                acc[field] = filter[field];
                delete filter[field];
            }
            return acc;
        }, {});
        return { filter, keyExpression };
    }
    async putCommand(data) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.collection,
                Item: data,
            });
            const result = await this.dbClient.send(command);
            if (result.$metadata.httpStatusCode == DynamoDBResponseCode.Ok) {
                const _getCommand = new lib_dynamodb_1.GetCommand({
                    TableName: this.collection,
                    Key: { PK: data.PK, SK: data.SK },
                });
                const { Item } = await this.dbClient.send(_getCommand);
                return Item;
            }
        }
        catch (err) {
            throw new customError_1.DatabaseError(err);
        }
    }
    async deleteCommand(key) {
        if (Object.keys(key).length <= 0)
            throw new customError_1.InvalidQueryParamsError('key');
        const params = {
            TableName: this.collection,
            Key: key,
        };
        try {
            return await this.dbClient.send(new lib_dynamodb_1.DeleteCommand(params));
        }
        catch (err) {
            throw new customError_1.DatabaseError(err);
        }
    }
    async getCommand(query, fields = []) {
        if (Object.keys(query).length <= 0)
            throw new customError_1.InvalidQueryParamsError('query');
        try {
            const params = { TableName: this.collection, Key: query };
            if (fields.length > 0) {
                const { projectionExpression, expressionAttributeNames } = this.convertFieldsToDynamoExpression(fields);
                params.ProjectionExpression = projectionExpression;
                params.ExpressionAttributeNames = expressionAttributeNames;
            }
            const command = new lib_dynamodb_1.GetCommand(params);
            const { Item } = await this.dbClient.send(command);
            return Item ?? {};
        }
        catch (err) {
            throw new customError_1.DatabaseError(err);
        }
    }
    convertFieldsToDynamoExpression(fields) {
        let projectionExpression = '';
        const expressionAttributeNames = {};
        fields.forEach((field, index) => {
            const placeholder = `#${field}`;
            projectionExpression += `${index > 0 ? ', ' : ''}${placeholder}`;
            expressionAttributeNames[placeholder] = field;
        });
        return { projectionExpression, expressionAttributeNames };
    }
    async query(query, projectionExpression, limit, sort) {
        try {
            const { filter, keyExpression } = this.getKeyExpression(query);
            const { keyConditionExpression, filterExpression, expressionAttributeNames, expressionAttributeValues, } = this.buildQueryExpression(filter, keyExpression);
            const params = {
                TableName: this.collection,
                Limit: limit,
                ScanIndexForward: sort[0] != -1, //true for ascending, false for descending
            };
            if (Object.keys(expressionAttributeNames).length > 0) {
                params.ExpressionAttributeNames = expressionAttributeNames;
            }
            if (Object.keys(expressionAttributeValues).length > 0) {
                params.ExpressionAttributeValues = expressionAttributeValues;
            }
            if (Object.keys(keyConditionExpression).length > 0) {
                params.KeyConditionExpression = keyConditionExpression;
            }
            if (Object.keys(filterExpression).length > 0) {
                params.FilterExpression = filterExpression;
            }
            if (projectionExpression.length > 0) {
                params.ProjectionExpression = projectionExpression.join(',');
            }
            if (sort && !keyConditionExpression) {
                params.IndexName = Object.keys(sort)[0];
                //if(params.ExpressionAttributeNames!=undefined){
                //  params.ExpressionAttributeNames["#createdAt"]="createdAt"
                //}
            }
            if (keyConditionExpression) {
                const { Items, LastEvaluatedKey } = await this.dbClient.send(new lib_dynamodb_1.QueryCommand(params));
                return { Items: Items ?? [], LastEvaluatedKey };
            }
            else {
                const { Items, LastEvaluatedKey } = await this.dbClient.send(new lib_dynamodb_1.ScanCommand(params));
                return { Items: Items ?? [], LastEvaluatedKey };
            }
        }
        catch (err) {
            throw new customError_1.DatabaseError(err);
        }
    }
    async countCommand(query) {
        try {
            const { filter, keyExpression } = this.getKeyExpression(query);
            const { keyConditionExpression, filterExpression, expressionAttributeNames, expressionAttributeValues, } = this.buildQueryExpression(filter, keyExpression);
            const params = {
                TableName: this.collection,
                Select: 'COUNT',
            };
            if (Object.keys(expressionAttributeNames).length > 0) {
                params.ExpressionAttributeNames = expressionAttributeNames;
            }
            if (Object.keys(expressionAttributeValues).length > 0) {
                params.ExpressionAttributeValues = expressionAttributeValues;
            }
            if (Object.keys(keyConditionExpression).length > 0) {
                params.KeyConditionExpression = keyConditionExpression;
            }
            if (Object.keys(filterExpression).length > 0) {
                params.FilterExpression = filterExpression;
            }
            if (keyConditionExpression) {
                const { Count } = await this.dbClient.send(new lib_dynamodb_1.QueryCommand(params));
                return Count ?? 0;
            }
            else {
                const { Count } = await this.dbClient.send(new lib_dynamodb_1.ScanCommand(params));
                return Count ?? 0;
            }
        }
        catch (err) {
            throw new customError_1.DatabaseError(err);
        }
    }
    buildQueryExpression(filter, keyExpression) {
        let keyConditionExpression = '';
        let filterExpression = '';
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};
        for (const [key, value] of Object.entries(filter)) {
            const expressionKey = `:${key}`;
            const expressionName = `${key}`;
            if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
                // Handle comparison operators
                const operator = Object.keys(value)[0];
                const operand = value[operator];
                filterExpression += `#${key} ${operator} ${expressionKey} and `;
                expressionAttributeValues[expressionKey] = operand;
                expressionAttributeNames[`#${expressionName}`] = key;
            }
            else {
                // Handle direct equality
                filterExpression += `#${key} = ${expressionKey} and `;
                expressionAttributeValues[expressionKey] = value;
                expressionAttributeNames[`#${expressionName}`] = key;
            }
        }
        for (const [key, value] of Object.entries(keyExpression)) {
            const expressionKey = `:${key}`;
            const expressionName = `${key}`;
            if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
                // Handle comparison operators
                const operator = Object.keys(value)[0];
                const operand = value[operator];
                if (key == 'SK_PREFIX') {
                    keyConditionExpression += `begins_with(SK, :${key}) and `;
                }
                else {
                    keyConditionExpression += `#${key} ${operator} ${expressionKey} and `;
                    expressionAttributeNames[`#${expressionName}`] = key;
                }
                expressionAttributeValues[expressionKey] = operand;
            }
            else {
                // Handle direct equality
                if (key == 'SK_PREFIX') {
                    keyConditionExpression += `begins_with(SK, :${key}) and `;
                }
                else {
                    keyConditionExpression += `#${key} = ${expressionKey} and `;
                    expressionAttributeNames[`#${expressionName}`] = key;
                }
                expressionAttributeValues[expressionKey] = value;
            }
        }
        // Remove the last ' and '
        keyConditionExpression = keyConditionExpression.slice(0, -5);
        filterExpression = filterExpression.slice(0, -5);
        return {
            keyConditionExpression,
            filterExpression,
            expressionAttributeNames,
            expressionAttributeValues,
        };
    }
}
exports.DynamoCommands = DynamoCommands;
_DynamoCommands_collectionKeyName = new WeakMap();
