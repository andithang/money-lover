import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Icon } from 'app/model/icon.model';
import { Category } from 'app/model/category.model';
import { CONSTS } from 'app/consts';

@Injectable()
export class CommonService {

    constructor(private http: HttpClient) { }

    getListData(model: string, search: any) {
        let api: string = `icon:list`;
        return this.http.post<Icon[]>(environment.SERVER_URL, { ...search, api_name: api }, { observe: "body" });
    }

    /* #region Category */
    getListCategories(search: string, page: number = 0, size: number = CONSTS.page_size_get_all) {
        const api_name: string = "category:list";
        return this.http.post<{results: Category[], total: number}>(environment.SERVER_URL, { api_name, search, page, size }, { observe: "body" });
    }

    insertCategory(data: { name: string, icon: string, transactionType: number, isDefault?: number }) {
        const api_name: string = data.isDefault ? "category:create-admin": "category:create";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }

    updateCategory(data: { name: string, icon: string, id: string, transactionType: number, isDefault?: number }) {
        const api_name: string = data.isDefault ? "category:update-admin": "category:update";
        return this.http.post<Category[]>(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }

    deleteCategories(data: { ids: string[], isAdmin: boolean }) {
        const api_name: string = data.isAdmin ? "category:delete-admin": "category:delete";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }
    /* #endregion */

    /* #region Icon */
    saveIconData(data: { file: string }) {
        const api_name: string = "icon:upload";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }

    deleteIcon(data: { ids: string[], paths: string[] }) {
        const api_name: string = "icon:delete";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }
    /* #endregion */

    /* #region Wallet type */
    getListWalletTypes(search: any) {
        const api_name: string = "wallettype:list";
        return this.http.post<{results: Category[], total: number }>(environment.SERVER_URL, { api_name, ...search }, { observe: "body" });
    }

    insertWalletType(data: { name: string, icon: string }) {
        const api_name: string = "wallettype:create";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }

    updateWalletType(data: { name: string, icon: string, id: string }) {
        const api_name: string = "wallettype:update";
        return this.http.post<Category[]>(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }

    deleteWalletTypes(data: { ids: string[] }) {
        const api_name: string = "wallettype:delete";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }
    /* #endregion */
}