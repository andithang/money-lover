import { Base } from "./base.model";
import { Module } from "./module.model";

export interface TreeModuleItem extends Base {
    module: Module;
    children: TreeModuleItem[],
    _id: string
}

export interface TreeModuleItemFlatNode {
    module: Module,
    level: number,
    expandable: boolean,
    moduleId: string,
    /**
     * use when editting or creating
     */
    tempModuleId: string,
    _id: string | number
}