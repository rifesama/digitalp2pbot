"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsService = exports.PER_PAGE = void 0;
const jtd_1 = __importDefault(require("ajv/dist/jtd"));
const customError_1 = require("./customError");
const moment_1 = __importDefault(require("moment"));
const dbCommands_1 = require("./dbCommands");
const ajv = new jtd_1.default({ removeAdditional: true });
const TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
exports.PER_PAGE = 100;
class ItemsService extends dbCommands_1.DynamoCommands {
    constructor(dbClient, collection) {
        super(dbClient, collection);
    }
    async getSchema() {
        return {};
    }
    getKeyName() {
        return 'Id';
    }
    async validateSchema(data) {
        const schema = await this.getSchema();
        const validate = ajv.compile(schema);
        if (!validate(data)) {
            if (validate.errors)
                throw new customError_1.ValidationError(validate.errors
                    .map((error) => {
                    return `Error validation schema ${error.instancePath}: ${error.message}`;
                })
                    .join(', '));
        }
    }
    async validateData(data) { }
    async create(data) {
        await this.beforeCreate(data);
        await this.validateSchema(data);
        await this.validateData(data);
        data.createdAt = data.updatedAt = (0, moment_1.default)().format(TIMESTAMP_FORMAT);
        const item = await this.putCommand(data);
        return await this.onCreate(item);
    }
    async beforeCreate(data) { }
    async onCreate(data) {
        return data;
    }
    async beforeUpdateSetQuery(query) { }
    async beforeUpdate(record, data) { }
    async update(query, data) {
        const now = new Date();
        await this.beforeUpdateSetQuery(query);
        let item = await this.getCommand(query);
        if (item != undefined) {
            await this.beforeUpdate(item, data);
            data = { ...item, ...data };
            await this.validateSchema(data);
            await this.validateData(data);
            data.updatedAt = (0, moment_1.default)().format(TIMESTAMP_FORMAT);
            item = await this.putCommand(data);
            return await this.onUpdate(item ?? {});
        }
        else {
            throw new customError_1.ResourceNotFoundError('Resource not found');
        }
    }
    async onUpdate(data) {
        return data;
    }
    async beforeLoad(query, rawQuery, fields, sort = { createdAt: -1 }) {
        return { query, fields, sort };
    }
    async load({ query = {}, rawQuery = {}, fields = [], sort, perPage = exports.PER_PAGE, }) {
        const result = await this.beforeLoad(query, rawQuery, fields, sort);
        query = result.query;
        fields = result.fields;
        sort = result.sort;
        const { Items, LastEvaluatedKey } = await this.query(query, fields, perPage, sort);
        return { items: await this.onLoad(Items ?? []), lastEvaluatedKey: LastEvaluatedKey };
    }
    async onLoad(items) {
        return items;
    }
    async beforeLoadOne(query, fields = []) {
        return { query, fields };
    }
    async loadOne(query = {}, fields) {
        const result = await this.beforeLoadOne(query, fields);
        query = result.query;
        fields = result.fields;
        let item = await this.getCommand(query, fields);
        if (item != undefined && Object.keys(item).length > 0) {
            return await this.onLoadOne(item);
        }
        else {
            throw new customError_1.ResourceNotFoundError('Resource not found');
        }
    }
    async onLoadOne(item) {
        return item;
    }
    async beforeDeleteSetCriteria(query) { }
    async beforeDelete(item, query) { }
    async onDelete(item) { }
    async delete(query = {}, logic = false) {
        this.beforeDeleteSetCriteria(query);
        const item = await this.getCommand(query);
        if (item != undefined && Object.keys(item).length > 0) {
            this.beforeDelete(item, query);
            const result = await this.deleteCommand(query);
            await this.onDelete(item);
            return result;
        }
        else {
            throw new customError_1.ResourceNotFoundError('Resource not found');
        }
    }
    async count(query) {
        return await this.countCommand(query);
    }
}
exports.ItemsService = ItemsService;
