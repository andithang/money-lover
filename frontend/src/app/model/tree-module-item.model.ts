import { Base } from "./base.model";
import { Module } from "./module.model";

export interface TreeModuleItem extends Base {
    module: Module;
    children: TreeModuleItem[],
}

export interface TreeModuleItemFlatNode {
    module: Module,
    level: number,
    expandable: boolean,
    moduleId: string,
    /**
     * use when editting or creating
     */
    tempModuleId: string
}