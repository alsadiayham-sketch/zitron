import {
  handleDataDelete,
  handleDataGet,
  handleDataMutation,
  type FunctionContext,
} from "../_lib/backend";

export const onRequestGet = (context: FunctionContext) => handleDataGet(context);
export const onRequestPost = (context: FunctionContext) => handleDataMutation(context);
export const onRequestPatch = (context: FunctionContext) => handleDataMutation(context);
export const onRequestDelete = (context: FunctionContext) => handleDataDelete(context);
