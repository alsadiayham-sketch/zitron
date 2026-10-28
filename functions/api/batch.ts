import { handleBatch, type FunctionContext } from "../_lib/backend";

export const onRequestPost = (context: FunctionContext) => handleBatch(context);
