import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { NewTransaction, Transaction, TransactionImport } from 'app/model/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
    constructor(
        private http: HttpClient
    ) { }

    insertTransaction(data: { category: string, note: string, wallet: string, amount: number, budget?: string }) {
        const api_name: string = "transaction:create";
        return this.http.post(environment.SERVER_URL, { api_name, ...data }, { observe: "body" });
    }

    getListData(search: {
        from: Date,
        to: Date
    }) {
        let api: string = `transaction:list`;
        return this.http.post<Transaction[]>(environment.SERVER_URL, { api_name: api, ...search }, { observe: "body" });
    }

    getTransaction(id: string){
        const api: string = "transaction:get-one";
        return this.http.post<Transaction>(environment.SERVER_URL, { api_name: api, id }, { observe: "body" });
    }

    updateTransaction(transaction: NewTransaction){
        const api: string = "transaction:update";
        return this.http.post<Transaction>(environment.SERVER_URL, { api_name: api, ...transaction }, { observe: "body" });
    }

    createTransaction(transaction: NewTransaction){
        const api: string = "transaction:add";
        return this.http.post<Transaction>(environment.SERVER_URL, { api_name: api, ...transaction }, { observe: "body" });
    }

    deleteTransaction(_id: string){
        const api: string = "transaction:delete";
        return this.http.post<Transaction>(environment.SERVER_URL, { api_name: api, id: _id }, { observe: "body" });
    }

    readImportFile(file: File){
        const api: string = "file:read-import-money-lover";
        let formData = new FormData();
        formData.append("file", file);
        formData.append("api_name", api)
        return this.http.post<TransactionImport[]>(environment.SERVER_URL, formData, { observe: "body" });
    }

}