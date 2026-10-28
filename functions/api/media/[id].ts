import { handleMediaGet, type FunctionContext } from "../../_lib/backend";

export const onRequestGet = (context: FunctionContext) => handleMediaGet(context);
