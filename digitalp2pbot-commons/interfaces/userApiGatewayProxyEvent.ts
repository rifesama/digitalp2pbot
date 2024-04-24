import { APIGatewayProxyEvent } from "aws-lambda";
import { userSchemaInterface } from "../models/user";
// Define an interface that extends the standard APIGatewayProxyEvent
export interface UserAPIGatewayProxyEvent extends APIGatewayProxyEvent {
    user?: userSchemaInterface;
}
