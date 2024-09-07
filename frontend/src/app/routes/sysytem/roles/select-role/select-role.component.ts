import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { CONSTS } from 'app/consts';
import { Role } from 'app/model/role.model';
import { RoleService } from '../role.service';
import { checkIsCheckAll } from '@shared';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { ToastrService } from 'ngx-toastr';
import { APP_ACTIONS } from 'app/actions';

@Component({
    selector: 'select-role',
    templateUrl: 'select-role.component.html',
    styles: [`        
        .item-prop {
            word-break: break-word;
        }
    `]
})

export class SelectRoleComponent implements OnInit {
    constructor(
        private roleService: RoleService,
        @Inject(MAT_DIALOG_DATA) public data: { selectedRoles: string[] },
        private authorService: AuthorizationService,  
        private toast: ToastrService,  
        private translate: TranslateService,
        private dialogRef: MatDialogRef<SelectRoleComponent>
    ) { }

    listRoles: Role[] = [];
    searchKey: string = "";
    displayedColumns: string[] = ['checkbox', 'Tên vai trò', 'Mã vai trò', 'Trạng thái'];
    columnProps: string[] = ['checkbox', 'title','code', 'status'];
    loading: boolean = false;
    listChecked: Set<string> = new Set<string>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    title: string = "Chọn vai trò";

    ngOnInit() { 
        this.getListRoles();
        if(this.data && this.data.selectedRoles){
            this.data.selectedRoles.forEach(id => {
                this.listChecked.add(id);
            })
        }
    }

    close(selectedRoles?: Set<string>){
        if(selectedRoles){
            this.roleService.getRolesByIds(Array.from(selectedRoles)).subscribe(res => {
                this.dialogRef.close(res.results);   
            })
        }
        else this.dialogRef.close(selectedRoles);
    }

    getListRoles(){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['get-list'])) {
            this.roleService.getListRoles(this.searchKey, this.page, this.pageSize).subscribe(res => {
                this.loading = false;
                this.listRoles = res.results;
                this.total = res.total;
            }, err => {
                this.loading = false;
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.role.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    getAllForCheckAll(){
        this.listRoles.forEach(item => {
            if(!this.listChecked.has(item._id)) this.listChecked.add(item._id)
        })
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchRoles(){
        this.loading = true;
        this.getListRoles()
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchRoles();
    }

    updateCheckAll(){        
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.values()), this.listRoles);
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