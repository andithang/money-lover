import { Base } from "./base.model";

export interface Module extends Base {
    title: string;
    description: string | null;
    code: string;
    status: 0 | 1;    
    is_delete: boolean;
}