import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { TreeModuleItemModel } from 'app/model/tree-module-item.model';

@Injectable({providedIn: 'root'})
export class TreeModuleService {
    constructor(private http: HttpClient) { }

    getTree = () => {
        let api: string = `tree-modules:get-tree`;
        return this.http.post<TreeModuleItemModel[]>(environment.SERVER_URL, { api_name: api }, { observe: "body" });
    }

    updateTree = (dataFlatten: TreeModuleItemModel[]) => {
        let api: string = `tree-modules:update-tree`;
        return this.http.post<{data: TreeModuleItemModel[]}>(environment.SERVER_URL, { api_name: api, dataFlatten }, { observe: "body" });
    }
    
}