import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable()
export class ReportService {
    constructor(
        private http: HttpClient
    ) { }
    
    getAveragePerMonth(year?: number): Observable<{
        averageIncome: number,
        averageOutcome: number,
        sumIncome: number,
        sumOutcome: number,
    }>{        
        const api_name: string  = "report:averageMonth";
        return this.http.post<{
            averageIncome: number,
            averageOutcome: number,
            sumIncome: number,
            sumOutcome: number,
        }>(environment.SERVER_URL, {api_name, year}, {observe: "body"});
    }

    getOverallEveryMonth(year?: number): Observable<{
        income: number[],
        outcome: number[]
    }>{
        const api_name: string = "report:overall";
        return this.http.post<{
            income: number[],
            outcome: number[]
        }>(environment.SERVER_URL, {api_name, year}, {observe: "body"});
    }
}