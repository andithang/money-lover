import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Permission } from 'app/model/permission.model';
import { CONSTS } from 'app/consts';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ToastrService } from 'ngx-toastr';
import { PageEvent } from '@angular/material/paginator';
// import { PermissionDialogComponent } from './permission-dialog.component';
import { PermissionService } from './permission.service';
import { ModuleAction } from 'app/model/module-action';
import { PermissionDialogComponent } from './permission-dialog.component';
import { Module } from 'app/model/module.model';
import { Action } from 'app/model/action.model';
import { checkIsCheckAll } from '@shared';

@Component({
    selector: 'permissions',
    templateUrl: 'permissions.component.html',
    styleUrls: ['permissions.component.scss']
})

export class PermissionMngComponent implements OnInit {
    constructor(
        private permissionService: PermissionService,
        private dialogService: MatDialog,
        private toast: ToastrService
    ) { }

    ngOnInit() { 
        this.searchPermissions()
    }

    listPermissions: Partial<Permission>[] = [];
    searchKey: string = "";
    loading: boolean = false;
    listChecked: Map<string, Partial<Permission>> = new Map<string, Partial<Permission>>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    mapOfExpandedPermission: Map<string, {loading: boolean, data?: Permission}> = new Map<string, {loading: boolean, data?: Permission}>();
    mapOfModuleActions: Map<string, {page: number, size: number, list?: ModuleAction[], loading: boolean, total?: number, displayList?: ModuleAction[]}> = new Map<string, {page: number, size: number, list?: ModuleAction[], loading: boolean, total?: number, displayList?: ModuleAction[]}>();
    /**
     * permission._id + '.' + module._id is the key
     */
    mapOfActions: Map<string, { list: Action[], page: number, size: number, total: number, module: Module, displayList: Action[] }> = new Map<string, { list: Action[], page: number, size: number, total: number, module: Module, displayList: Action[] }>();
    window = window;
    displayedColumns: string[] = ['Tên hành động', 'Mã hành động', 'Trạng thái'];
    columnProps: string[] = ['title','code', 'status'];

    getListPermissions(){
        this.permissionService.getListPermissions(this.searchKey, this.page, this.pageSize).subscribe(res => {
            this.loading = false;
            this.listPermissions = res.results;
            this.total = res.total;
            this.updateCheckAll();
            if(!this.listPermissions.length) this.isAllChecked = false;
        }, err => {
            this.loading = false;
        })
    }

    setMapOfActions(permissionId: string, moduleActions: Partial<ModuleAction>[]){
        moduleActions.forEach(ma => {
            this.mapOfActions.set(permissionId + '.' + ma.module._id, {
                page: 0,
                size: CONSTS.page_size,
                list: ma.actions,
                total: ma.actions.length,
                module: ma.module,
                displayList: ma.actions.filter((act, ind) => ind >= 0 && ind < CONSTS.page_size)
            })
        })
    }

    onChangePageActions(key: string, evt: PageEvent){
        const curr = this.mapOfActions.get(key);
        this.mapOfActions.set(key, {...curr, page: evt.pageIndex, displayList: curr.list.filter((_, ind) => ind >= evt.pageIndex*curr.size && ind < (evt.pageIndex+1)*curr.size)});
    }

    onChangePageModuleActions(key: string, evt: PageEvent){
        const curr = this.mapOfModuleActions.get(key);
        this.mapOfModuleActions.set(key, {...curr, page: evt.pageIndex, displayList: curr.list.filter((_, ind) => ind >= evt.pageIndex*curr.size && ind < (evt.pageIndex+1)*curr.size)})
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchPermissions(){
        this.loading = true;
        this.getListPermissions()
    }

    open(permission?: Partial<Permission>, evt?: Event){
        this.dialogService.open(PermissionDialogComponent, {
            data: {
                id: permission ? permission._id: null
            }
        })
        .afterClosed().subscribe((res: string) => {
            if(res){
                this.searchPermissions();
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
                title: "Xác nhận xóa quyền?",
                message: `Xóa vĩnh viễn ${this.getNumOfSelected()} quyền?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                this.permissionService.deletePermission(Array.from(this.listChecked.keys()))
                .subscribe(res => {
                    this.loading = false;
                    this.resetListChecked();
                    this.toast.success("Xóa vĩnh viễn quyền thành công");
                    this.searchPermissions();
                }, err => {
                    this.loading = false;
                    this.toast.error("Xóa vĩnh viễn quyền thất bại")
                })                
            }
        })
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchPermissions();
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
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.keys()), this.listPermissions);
    }

    toggleCheckItem(val: boolean, id: string){
        if(val) this.listChecked.set(id, this.listPermissions.find(r => r._id == id));
        else this.listChecked.delete(id);
        this.updateCheckAll();
    }

    toggleCheckAllItems(val: boolean){
        if(val){
            this.listPermissions.forEach(permission => {
                if(!this.listChecked.has(permission._id)) this.listChecked.set(permission._id, permission);
            })
        } else this.resetListChecked();
    }

    isChecked(id: string){
        return this.listChecked.has(id);
    }

    deleteSingle(permission: Partial<Permission>){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận xóa quyền`,
                message: `Xóa quyền '${permission.title}'?`
            }
        })
        .afterClosed().subscribe((isConfirmed?: boolean) => {
            if(isConfirmed){
                this.loading = true;
                this.permissionService.deletePermission([permission._id]).subscribe(() => {
                    this.toast.success(`Xóa quyền thành công`);
                    this.loading = false;
                    this.searchPermissions();
                    if(this.listChecked.has(permission._id)) this.listChecked.delete(permission._id);
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

    changeStatus(permission: Partial<Permission>){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận ${permission.status ? '': 'mở'} khóa quyền?`,
                message: `${permission.status ? 'Khóa': 'Mở khóa'} quyền ${permission.title}?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                const newStatus = permission.status ? 0: 1;
                this.permissionService.changeStatusPermission([permission._id], newStatus)
                .subscribe(res => {
                    this.loading = false;
                    this.toast.success(`${permission.status ? 'Khóa': 'Mở khóa'} quyền thành công`);
                    this.searchPermissions();
                    this.updateListCheckedAfterStatusChanged([permission._id], newStatus)
                }, err => {
                    this.loading = false;
                })                
            }
        })
    }

    changeStatusSelected(currStatus: 0 | 1){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận ${currStatus ? '': 'mở'} khóa quyền?`,
                message: `${currStatus ? 'Khóa': 'Mở khóa'} ${this.getNumOfSelected()} quyền?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                const newStatus = currStatus ? 0: 1;
                this.permissionService.changeStatusPermission(Array.from(this.listChecked.keys()), newStatus)
                .subscribe(res => {
                    this.loading = false;
                    this.toast.success(`${currStatus ? 'Khóa': 'Mở khóa'} quyền thành công`);
                    this.searchPermissions();     
                    this.resetListChecked(); 
                }, err => {
                    this.loading = false;
                })                
            }
        })
    }

    expandPermission(permission: Partial<Permission>){
        this.mapOfExpandedPermission.set(permission._id, {loading: true});
        this.permissionService.getPermission(permission._id!).subscribe(per => {
            this.mapOfExpandedPermission.set(permission._id, {data: per, loading: false});
            this.mapOfModuleActions.set(permission._id, {loading: true, page: 0, size: CONSTS.page_size});
            this.getListModuleActions(permission._id)
        }, () => {
            this.mapOfExpandedPermission.set(permission._id, {loading: false});
        })
    }
    
    getListModuleActions(id: string, page: number = 0, size: number = CONSTS.page_size){
        const curr = this.mapOfModuleActions.get(id);
        this.permissionService.getModuleActionsPermission(id, page, size).subscribe(data => {
            this.mapOfModuleActions.set(id, {loading: false, page: 0, size: CONSTS.page_size, total: data.total, list: data.results, displayList: data.results.filter((_, ind) => ind >= 0 && ind < CONSTS.page_size)});
            this.setMapOfActions(id, data.results);
        }, () => {
            this.mapOfModuleActions.set(id, {...curr, loading: false}); // only set loading, keep current data
        })        
    }

    collapsePermission(permission: Partial<Permission>){
        this.mapOfExpandedPermission.delete(permission._id);
        this.mapOfModuleActions.delete(permission._id);
        const permissionKeys = Array.from(this.mapOfActions.keys()).filter(key => key.includes(permission._id));
        this.mapOfActions.forEach((val, key) => {
            if(permissionKeys.includes(key)){
                this.mapOfActions.delete(key);
            }
        })
    }

    stopPropagation(event: MouseEvent){
        event.stopPropagation();
    }
}