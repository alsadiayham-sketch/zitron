import { handleSession, type FunctionContext } from "../_lib/backend";

export const onRequestGet = (context: FunctionContext) => handleSession(context);
