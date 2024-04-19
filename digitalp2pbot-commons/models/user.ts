import Ajv, { JTDSchemaType, ErrorObject } from "ajv/dist/jtd";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ItemsService } from "digitalp2pbot-utils";
import {
    NumberRangeError,
    ValueGreaterThanZeroError,
} from "digitalp2pbot-utils";
import { error } from "console";
import { DynamoTablePrefix } from "../libs/dynamoConstants";
import { i18n as I18nType } from "i18next";
export interface userSchemaInterface {
    PK: string;
    SK: string;
    userName: string;
    firstName?: string;
    lastName?: string;
    lang: string;
    tradesCompleted: number;
    totalReviews: number;
    lastRating: number;
    totalRating: number;
    volumeTraded: number;
    admin: boolean;
    banned: boolean;
    showUsername: boolean;
    showVolumeTraded: boolean;
    disputes: number;
    defaultCommunityId?: string;
    isPremium: boolean;
    isBot: boolean;
    updatedAt?: Date;
    createdAt?: Date;
}
export class User extends ItemsService {
    constructor(
        dbClient: DynamoDBDocumentClient,
        private i18n: I18nType
    ) {
        super(dbClient, process.env.TABLE_NAME as string);
    }
    setKeyExpressions(data: Record<string, any>): void {
        data.PK = `${DynamoTablePrefix.Users}${data.PK}`;
        data.SK = DynamoTablePrefix.Metadata;
    }
    async beforeCreate(data: Record<string, any>): Promise<void> {
        if (data.lastName == null) data.lastName = undefined;
        data.lang = data.lang ?? "es";
        data.tradesCompleted = data.tradesCompleted ?? 0;
        data.totalReviews = data.totalReviews ?? 0;
        data.totalRating = data.totalRating ?? 0;
        data.lastRating = data.lastRating ?? 0;
        data.volumeTraded = data.volumeTraded ?? 0;
        data.admin = data.admin ?? false;
        data.banned = data.banned ?? false;
        data.isPremium = data.isPremium ?? false;
        data.isBot = data.isBot ?? false;
        data.showUsername = data.showUsername ?? false;
        data.showVolumeTraded = data.showVolumeTraded ?? false;
        data.disputes = data.disputes ?? 0;
    }
    async validateData(data: Record<string, any>): Promise<void> {
        if (data.lastRating < 0 || data.lastRating > 5)
            throw new NumberRangeError("Last rating", 0, 5);
        if (data.totalRating < 0 || data.totalRating > 5)
            throw new NumberRangeError("Total Rating", 0, 5);
        if (data.tradesCompleted < 0)
            throw new ValueGreaterThanZeroError("Trades completed");
        if (data.totalReviews < 0)
            throw new ValueGreaterThanZeroError("Total reviews");
    }
    customHandleErrors(
        errors: ErrorObject<string, Record<string, any>, unknown>[]
    ): ErrorObject<string, Record<string, any>, unknown>[] {
        errors.forEach((err: ErrorObject) => {
            switch (err.params.missingProperty) {
                case "userName":
                    err.message = this.i18n.t("non_handle_error");
            }
        });
        return errors;
    }

    async getSchema(): Promise<object> {
        const schema: JTDSchemaType<userSchemaInterface> = {
            properties: {
                PK: { type: "string" },
                SK: { type: "string" },
                userName: { type: "string" },
                lang: { type: "string" },
                tradesCompleted: { type: "uint32" },
                totalReviews: { type: "uint32" },
                lastRating: { type: "uint8" },
                totalRating: { type: "uint8" },
                volumeTraded: { type: "uint32" },
                admin: { type: "boolean" },
                banned: { type: "boolean" },
                showUsername: { type: "boolean" },
                showVolumeTraded: { type: "boolean" },
                disputes: { type: "uint32" },
                isPremium: { type: "boolean" },
                isBot: { type: "boolean" },
            },
            optionalProperties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                defaultCommunityId: { type: "string" },
                updatedAt: { type: "timestamp" },
                createdAt: { type: "timestamp" },
            },
            additionalProperties: false,
        };
        return schema;
    }
}
