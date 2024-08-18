import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { User } from 'app/model/user.model';

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    constructor(private http: HttpClient) { }

    getListData(search: Object) {
        let api: string = `users:get-list`;
        return this.http.post<{results: Partial<User>[], total: number}>(environment.SERVER_URL, { ...search, api_name: api }, { observe: "body" });
    }

    deactivateUsers(ids: string[]){
        let api: string = `users:deactivate`;
        return this.http.post<{results: any}>(environment.SERVER_URL, {api_name: api, ids}, {observe: 'body'});
    }

    deleteUsers(ids: string[]){
        let api: string = `users:delete-temp-many`;
        return this.http.post<{results: any}>(environment.SERVER_URL, {api_name: api, ids}, {observe: 'body'});
    }

    unlockUsers(ids: string[]){
        let api: string = `users:unlock`;
        return this.http.post<{results: any}>(environment.SERVER_URL, {api_name: api, ids}, {observe: 'body'});
    }
    
    updateUser(user: Partial<User>){
        let api: string = `users:update`;
        return this.http.post(environment.SERVER_URL, {api_name: api, ...user}, {observe: 'body'});
    }
    
    updateUserRole(userId: string, role: string){
        let api: string = `users:update-user-role`;
        return this.http.post(environment.SERVER_URL, {api_name: api, userId, role}, {observe: 'body'});
    }

    getUser(){
        let api: string = `users:get-one`;
        return this.http.post<User>(environment.SERVER_URL, {api_name: api}, {observe: 'body'});
    }

    deleteSingleUser(id: string){
        let api: string = "users:delete-temp-one";
        return this.http.post<User>(environment.SERVER_URL, {api_name: api, i: id}, {observe: 'body'});
    }

    restoreUsers(ids: string[]){
        let api: string = "users:restore-many";
        return this.http.post<User>(environment.SERVER_URL, {api_name: api, ids}, {observe: 'body'});
    }

    deletePermanently(ids: string[]){
        let api: string = "users:delete-many-forever";
        return this.http.post<User>(environment.SERVER_URL, {api_name: api, ids}, {observe: 'body'});
    }

    resetPassword(id: string){
        let api: string = "users:reset-password";
        return this.http.post<User>(environment.SERVER_URL, {api_name: api, i: id}, {observe: 'body'});
    }
}