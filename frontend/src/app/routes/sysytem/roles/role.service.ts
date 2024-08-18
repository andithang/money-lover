import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { CONSTS } from 'app/consts';
import { Role } from 'app/model/role.model';

@Injectable({providedIn: 'root'})
export class RoleService {
    constructor(
        private http: HttpClient
    ) { }

    getListRoles(search: string = "", page: number = 0, size: number = CONSTS.page_size, params?: {[key: string]: any}){
        const api_name: string = "role:get-list";
        return this.http.post<{results: Role[], total: number}>(environment.SERVER_URL, { api_name, search, page, size, ...params }, { observe: "body" });
    }

    addRole(role: Partial<Role>){
        const api_name: string = "role:create";
        return this.http.post<Role>(environment.SERVER_URL, { api_name, ...role }, { observe: "body" });
    }

    updateRole(role: Partial<Role>){
        const api_name: string = "role:update";
        return this.http.post<Role>(environment.SERVER_URL, { api_name, ...role }, { observe: "body" });
    }

    deleteRole(ids: string[]){
        const api_name: string = "role:delete-many";
        return this.http.post<Role[]>(environment.SERVER_URL, { api_name, ids }, { observe: "body" });
    }

    changeStatusRole(ids: string[], status: 0 | 1){
        const api_name: string = "role:update-status";
        return this.http.post<Role[]>(environment.SERVER_URL, { api_name, ids, status }, { observe: "body" });
    }

    getRole(id: string){
        const api_name: string = "role:get-one";
        return this.http.post<Role>(environment.SERVER_URL, { api_name, id }, { observe: "body" });
    }

    getRolesByIds(ids: string[]){
        const api_name: string = "role:get-many";
        return this.http.post<{results: Role[]}>(environment.SERVER_URL, { api_name, ids }, { observe: "body" });
    }
    
}