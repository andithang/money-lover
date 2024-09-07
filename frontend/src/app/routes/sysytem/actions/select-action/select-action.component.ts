import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { CONSTS } from 'app/consts';
import { Action } from 'app/model/action.model';
import { ActionService } from '../action.service';
import { checkIsCheckAll } from '@shared';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'select-action',
    templateUrl: 'select-action.component.html',
    styles: [`        
        .item-prop {
            word-break: break-word;
        }
    `]
})

export class SelectActionComponent implements OnInit, OnDestroy {
    constructor(
        private actionService: ActionService,
        @Inject(MAT_DIALOG_DATA) public data: { selectedActions: string[] },
        private authorService: AuthorizationService,    
        private toast: ToastrService,
        private translate: TranslateService,
        private dialogRef: MatDialogRef<SelectActionComponent>
    ) { 
    }

    listActions: Action[] = [];
    searchKey: string = "";
    displayedColumns: string[] = ['checkbox', 'Tên action', 'Mã action', 'Trạng thái'];
    columnProps: string[] = ['checkbox', 'title','code', 'status'];
    loading: boolean = false;
    listChecked: Set<string> = new Set<string>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    title: string = "Chọn action";
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    ngOnInit() { 
        this.getListActions();
        if(this.data && this.data.selectedActions){
            this.data.selectedActions.forEach(id => {
                this.listChecked.add(id);
            })
        }            
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    close(selectedActions?: Set<string>){
        if(selectedActions){
            if(this.authorService.isAuthorized(APP_ACTIONS.action['get-many'])) {
                this.actionService.getActionsByIds(Array.from(selectedActions)).subscribe(res => {
                    this.dialogRef.close(res.results);   
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-get-many'));
                this.loading = false;
            }
        }
        else this.dialogRef.close(selectedActions);
    }

    getListActions(){
        if(this.authorService.isAuthorized(APP_ACTIONS.action['get-list'])) {
            this.actionService.getListActions(this.searchKey, this.page, this.pageSize).subscribe(res => {
                this.loading = false;
                this.listActions = res.results;
                this.total = res.total;
                this.updateCheckAll();
            }, err => {
                this.loading = false;
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    getAllForCheckAll(){
        this.listActions.forEach(item => {
            if(!this.listChecked.has(item._id)) this.listChecked.add(item._id)
        })
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchActions(){
        this.loading = true;
        this.getListActions()
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchActions();
    }

    updateCheckAll(){        
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.values()), this.listActions);
    }

    toggleCheckItem(val: boolean, id: string){
        if(val) this.listChecked.add(id);
        else this.listChecked.delete(id);
        this.updateCheckAll();
    }

    toggleCheckAllItems(val: boolean){
        if(!val) this.resetListChecked();
        else {
            this.getAllForCheckAll();
        }
    }

    isChecked(id: string){        
        return this.listChecked.has(id);
    }

}