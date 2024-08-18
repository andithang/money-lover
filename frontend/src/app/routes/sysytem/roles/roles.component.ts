import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Role } from 'app/model/role.model';
import { CONSTS } from 'app/consts';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ToastrService } from 'ngx-toastr';
import { PageEvent } from '@angular/material/paginator';
import { RoleDialogComponent } from './role-dialog.component';
import { RoleService } from './role.service';
import { checkIsCheckAll } from '@shared';

@Component({
    selector: 'roles',
    templateUrl: 'roles.component.html',
    styleUrls: ['roles.component.scss']
})

export class RoleMngComponent implements OnInit {
    constructor(
        private roleService: RoleService,
        private dialogService: MatDialog,
        private toast: ToastrService
    ) { }

    ngOnInit() { 
        this.searchRoles()
    }

    listRoles: Partial<Role>[] = [];
    searchKey: string = "";
    displayedColumns: string[] = ['checkbox', 'Tên vai trò', 'Mã vai trò', 'Mô tả', 'Ngày tạo', 'Trạng thái', 'Thao tác'];
    columnProps: string[] = ['checkbox', 'title','code', 'description', 'dateCreated', 'status', 'actions'];
    loading: boolean = false;
    listChecked: Map<string, Partial<Role>> = new Map<string, Partial<Role>>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;

    getListRoles(){
        this.roleService.getListRoles(this.searchKey, this.page, this.pageSize).subscribe(res => {
            this.loading = false;
            this.listRoles = res.results;
            this.total = res.total;
            this.updateCheckAll();
            if(!this.listRoles.length) this.isAllChecked = false;
        }, err => {
            this.loading = false;
        })
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchRoles(){
        this.loading = true;
        this.getListRoles()
    }

    open(role?: Partial<Role>, evt?: Event){
        this.dialogService.open(RoleDialogComponent, {
            data: {
                id: role ? role._id: null
            },
            width: '400px'
        })
        .afterClosed().subscribe((res: string) => {
            if(res){
                this.searchRoles();
            }
        })
        if(evt){
            evt.stopPropagation()
        }
    }

    getNumOfSelected(){
        return this.listChecked.size;
    }

    delete(){   
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: "Xác nhận xóa vai trò?",
                message: `Xóa vĩnh viễn ${this.getNumOfSelected()} vai trò?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                this.roleService.deleteRole(Array.from(this.listChecked.keys()))
                .subscribe(res => {
                    this.loading = false;
                    this.resetListChecked();
                    this.toast.success("Xóa vĩnh viễn vai trò thành công");
                    this.searchRoles();
                }, err => {
                    this.loading = false;
                    this.toast.error("Xóa vĩnh viễn vai trò thất bại")
                })                
            }
        })
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchRoles();
    }

    isShowLockButton(){
        if(this.listChecked.size){
            const checkedItems = Array.from(this.listChecked.values());
            return checkedItems.length && checkedItems.map(u => u.status).find(s => s == 0) == null;
        }
        else return false;
    }

    isShowDeleteButton(){
        if(this.listChecked.size){
            const checkedItems = Array.from(this.listChecked.values());
            return checkedItems.length && checkedItems.map(u => u.is_delete).find(s => s) == null;
        }
        else return false;
    }

    isShowUnlockButton(){
        if(this.listChecked.size){
            const checkedItems = Array.from(this.listChecked.values());
            return checkedItems.length && checkedItems.map(u => u.status).find(s => s == 1) == null;
        }
        else return false;
    }

    updateCheckAll(){
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.keys()), this.listRoles);
    }

    toggleCheckItem(val: boolean, id: string){
        if(val) this.listChecked.set(id, this.listRoles.find(r => r._id == id));
        else this.listChecked.delete(id);
        this.updateCheckAll();
    }

    toggleCheckAllItems(val: boolean){
        if(val){
            this.listRoles.forEach(role => {
                if(!this.listChecked.has(role._id)) this.listChecked.set(role._id, role);
            })
        } else this.resetListChecked();
    }

    isChecked(id: string){
        return this.listChecked.has(id);
    }

    deleteSingle(role: Partial<Role>){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận xóa vai trò`,
                message: `Xóa vai trò '${role.title}'?`
            }
        })
        .afterClosed().subscribe((isConfirmed?: boolean) => {
            if(isConfirmed){
                this.loading = true;
                this.roleService.deleteRole([role._id]).subscribe(() => {
                    this.toast.success(`Xóa vai trò thành công`);
                    this.loading = false;
                    this.searchRoles();
                    if(this.listChecked.has(role._id)) this.listChecked.delete(role._id);
                }, () => this.loading = false)
            }
        })
    }

    updateListCheckedAfterStatusChanged(ids: string[], status: 0 | 1){
        ids.forEach(id => {
            if(this.listChecked.has(id)){
                this.listChecked.set(id, {
                    ...this.listChecked.get(id),
                    status
                })
            }
        })
    }

    changeStatus(role: Partial<Role>){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận ${role.status ? '': 'mở'} khóa vai trò?`,
                message: `${role.status ? 'Khóa': 'Mở khóa'} vai trò ${role.title}?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                const newStatus = role.status ? 0: 1;
                this.roleService.changeStatusRole([role._id], newStatus)
                .subscribe(res => {
                    this.loading = false;
                    this.toast.success(`${role.status ? 'Khóa': 'Mở khóa'} vai trò thành công`);
                    this.searchRoles();
                    this.updateListCheckedAfterStatusChanged([role._id], newStatus)
                }, err => {
                    this.loading = false;
                })                
            }
        })
    }

    changeStatusSelected(currStatus: 0 | 1){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận ${currStatus ? '': 'mở'} khóa vai trò?`,
                message: `${currStatus ? 'Khóa': 'Mở khóa'} ${this.getNumOfSelected()} vai trò?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                const newStatus = currStatus ? 0: 1;
                this.roleService.changeStatusRole(Array.from(this.listChecked.keys()), newStatus)
                .subscribe(res => {
                    this.loading = false;
                    this.toast.success(`${currStatus ? 'Khóa': 'Mở khóa'} vai trò thành công`);
                    this.searchRoles();       
                    this.resetListChecked();             
                }, err => {
                    this.loading = false;
                })                
            }
        })
    }
}