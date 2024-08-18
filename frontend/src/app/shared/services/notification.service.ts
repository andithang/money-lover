import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import { PriorityDialogComponent } from '@theme/notification/priority-dialog.component';
import { BaseSearch } from 'app/model/base.model';
import { Notification } from 'app/model/notification.model';
import { ToastrService } from 'ngx-toastr';
import { Subject, take } from 'rxjs';

@Injectable({providedIn: 'root'})
export class NotificationService {
    constructor(private dialogService: MatDialog, private http: HttpClient, private toastService: ToastrService) { }

    private notificationCount: number = 0;
    notificationsChange$ = new Subject<Partial<Notification>>();
    
    notify(notification: Partial<Notification>){
        if(notification.priority <= 1){
            this.openNotifyDetail(notification);
        }
        else {
            this.toastService.warning(notification.description, notification.title).onTap.pipe(take(1)).subscribe(() => {
                this.openNotifyDetail(notification);
            })
        }
    }

    putNotification(notification: Partial<Notification>){
        this.notificationCount += 1;
        this.notificationsChange$.next(notification);
    }

    getNotificationCount(){
        return this.notificationCount;
    }

    setNotificationCount(count: number){
        this.notificationCount = count;
    }

    getListNotification(params: Partial<Notification & BaseSearch>){
        const api_name: string = "notification:get-list";
        return this.http.post<{results: Partial<Notification>[], totalUnread: number, totalAll: number}>(environment.SERVER_URL, { api_name, ...params }, { observe: "body" });
    }

    openNotifyDetail(notification: Partial<Notification>){
        this.dialogService.open(PriorityDialogComponent, {
            width: '400px',
            data: {...notification}
        })
    }

    markRead(ids: string[]){
        const api_name: string = "notification:mark-as-read";
        return this.http.post(environment.SERVER_URL, { api_name, ids }, { observe: "body" });
    }

    markNoRepeat(id: string){
        const api_name: string = "notification:no-repeat";
        return this.http.post(environment.SERVER_URL, { api_name, id }, { observe: "body" });
    }
}