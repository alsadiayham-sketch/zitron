import { handleUpload, type FunctionContext } from "../_lib/backend";

export const onRequestPost = (context: FunctionContext) => handleUpload(context);
