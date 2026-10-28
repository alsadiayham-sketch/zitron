import { handleLogout, type FunctionContext } from "../_lib/backend";

export const onRequestPost = (context: FunctionContext) => handleLogout(context);
