import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { CONSTS } from 'app/consts';
import { Module } from 'app/model/module.model';
import { ModuleService } from '../module.service';
import { checkIsCheckAll } from '@shared';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'select-module',
    templateUrl: 'select-module.component.html',
    styles: [`        
        .item-prop {
            word-break: break-word;
        }
    `]
})

export class SelectModuleComponent implements OnInit, OnDestroy {
    constructor(
        private moduleService: ModuleService,
        @Inject(MAT_DIALOG_DATA) public data: { selectedModules: string[] },
        private authorService: AuthorizationService,    
        private toast: ToastrService,
        private translate: TranslateService,
        private dialogRef: MatDialogRef<SelectModuleComponent>
    ) { 
    }

    listModules: Module[] = [];
    searchKey: string = "";
    displayedColumns: string[] = ['checkbox', 'Tên module', 'Mã module', 'Trạng thái'];
    columnProps: string[] = ['checkbox', 'title','code', 'status'];
    loading: boolean = false;
    listChecked: Set<string> = new Set<string>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    title: string = "Chọn module";
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    ngOnInit() { 
        this.getListModules();
        if(this.data && this.data.selectedModules){
            this.data.selectedModules.forEach(id => {
                this.listChecked.add(id);
            })
        }       
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    close(selectedModules?: Set<string>){
        if(selectedModules){
            if(this.authorService.isAuthorized(APP_ACTIONS.module['get-many'])) {
                this.moduleService.getModulesByIds(Array.from(selectedModules)).subscribe(res => {
                    this.dialogRef.close(res.results);   
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-get-many'));
                this.loading = false;
            }
        }
        else this.dialogRef.close(selectedModules);
    }

    getListModules(){
        if(this.authorService.isAuthorized(APP_ACTIONS.module['get-list'])) {
            this.moduleService.getListModules(this.searchKey, this.page, this.pageSize).subscribe(res => {
                this.loading = false;
                this.listModules = res.results;
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
        this.listModules.forEach(item => {
            if(!this.listChecked.has(item._id)) this.listChecked.add(item._id)
        })
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchModules(){
        this.loading = true;
        this.getListModules()
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchModules();
    }

    updateCheckAll(){        
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.values()), this.listModules);
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