import { handleLogin, type FunctionContext } from "../_lib/backend";

export const onRequestPost = (context: FunctionContext) => handleLogin(context);
