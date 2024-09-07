import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Permission } from 'app/model/permission.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PermissionService } from './permission.service';
import { ToastrService } from 'ngx-toastr';
import { trim } from '@shared';
import { ModuleAction } from 'app/model/module-action';
import { Action } from 'app/model/action.model';
import { CONSTS } from 'app/consts';
import { Module } from 'app/model/module.model';
import { RoleService } from '../roles/role.service';
import { Role } from 'app/model/role.model';
import { PageEvent } from '@angular/material/paginator';
import { SelectModuleComponent } from '../modules/select-module/select-module.component';
import { SelectActionComponent } from '../actions/select-action/select-action.component';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';

@Component({
    selector: 'permission-dialog',
    templateUrl: 'permission-dialog.component.html',
    styleUrls: ['permission-dialog.component.scss']
})

export class PermissionDialogComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { id?: string },
        private permissionService: PermissionService,
        private roleService: RoleService,
        private toast: ToastrService,
        private dialogService: MatDialog,
        private dialogRef: MatDialogRef<PermissionDialogComponent>,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { }

    trim = trim;

    ngOnInit() {
        this.getListRoles();
        // update
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.permission['get-one'])) {
                this.permissionService.getPermission(this.data.id).subscribe(res => {
                    this.permission = res;
                    this.permissionForm.setValue({
                        title: res.title,
                        code: res.code,                    
                        description: res.description || '',                    
                        role: res.role._id,                    
                        allow: res.allow,                    
                    })
                    this.setMapOfActions(res.moduleAction);
                }, (err) => {
                    console.error(err);
                })
            } else this.toast.error(this.translate.instant('my-ml.permission.message.not-allow-get-one'));
        }
        // create
        else {
            this.title = "Thêm mới quyền";
            this.permission = {
                title: null,
                code: null,
                description: null,
                role: null,
                allow: false
            }
        }
    }

    permission: Partial<Permission>;
    title: string = "Chỉnh sửa quyền";
    permissionForm: FormGroup = new FormGroup({
        title: new FormControl(null, Validators.required),
        code: new FormControl(null, Validators.required),
        description: new FormControl(null),
        allow: new FormControl(false, Validators.required),
        role: new FormControl(null, Validators.required)
    });
    listRoles: Role[] = [];
    /**
     * module._id is the key
     */
    mapOfActions: Map<string, { list: Action[], page: number, size: number, total: number, module: Module, displayList: Action[] }> = new Map<string, { list: Action[], page: number, size: number, total: number, module: Module, displayList: Action[] }>();
    /**
     * - keys of mapOfActions, used for ngFor in html.
     * - ONLY the ones that are shown by the current page
     */
    listOfKeys: string[] = [];
    displayedColumns: string[] = ['checkbox', 'Tên hành động', 'Mã hành động', 'Trạng thái', 'Thao tác'];
    columnProps: string[] = ['checkbox', 'title','code', 'status', 'actions'];
    /**
     * list checked items for actions by each module
     */
    listChecked: Map<string, string[]> = new Map<string, string[]>();
    isAllChecked: boolean = false;
    pageModuleActions: number = 0;
    sizeModuleActions: number = CONSTS.page_size;

    close(msg?: Partial<Permission>){
        this.dialogRef.close(msg);
    }

    getCurrentData(): Permission {
        return {
            ...this.permission,
            ...this.permissionForm.value,
            moduleAction: Array.from(this.mapOfActions.keys()).map(key => {
                return {
                    module: key,
                    actions: this.mapOfActions.get(key).list.map(act => act._id)
                }
            })
        }
    }

    setMapOfActions(moduleActions: Partial<ModuleAction>[]){
        moduleActions.forEach(ma => {
            this.mapOfActions.set(ma.module._id, {
                page: 0,
                size: CONSTS.page_size,
                list: ma.actions,
                total: ma.actions.length,
                module: ma.module,
                displayList: ma.actions.filter((act, ind) => ind >= 0 && ind < CONSTS.page_size)
            })
            this.listChecked.set(ma.module._id, []);
        })
        this.setListOfKeysToShow();
    }

    save(){
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.permission.update)) {
                this.permissionService.updatePermission(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Cập nhật quyền thành công");
                    this.close(res);
                })
            } else this.toast.error(this.translate.instant('my-ml.permission.message.not-allow-update'));
        }
        else {
            if(this.authorService.isAuthorized(APP_ACTIONS.permission.create)) {
                this.permissionService.addPermission(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Thêm quyền thành công");
                    this.close(res);
                })
            } else this.toast.error(this.translate.instant('my-ml.permission.message.not-allow-create'));
        }
    }

    clearFormControl(name: string){
        this.permissionForm.get(name).setValue(null);
    }

    deleteSelected(key: string){
        const currAllList = this.mapOfActions.get(key).list, currDisplayList = this.mapOfActions.get(key).displayList;
        let newAllList = currAllList.filter(item => !this.listChecked.get(key).includes(item._id));
        let newDisplayList = currDisplayList.filter(item => !this.listChecked.get(key).includes(item._id));
        this.mapOfActions.set(key, {
            ...this.mapOfActions.get(key),
            list: newAllList,
            displayList: newDisplayList,
            total: newAllList.length
        })
    }

    deleteAction(action: Action, key: string){
        const currAllList = this.mapOfActions.get(key).list, currDisplayList = this.mapOfActions.get(key).displayList;
        let newAllList = currAllList.filter(item => item._id != action._id);
        let newDisplayList = currDisplayList.filter(item => item._id != action._id);
        this.mapOfActions.set(key, {
            ...this.mapOfActions.get(key),
            list: newAllList,
            displayList: newDisplayList,
            total: newAllList.length
        })
    }

    resetListChecked(key: string){
        this.listChecked.set(key, []);
    }

    updateCheckAll(key: string){
        let isCheckedAll = true;
        const listActions = this.mapOfActions.get(key).list;
        for (let index = 0; index < listActions.length; index++) {
            if(!this.listChecked.get(key).includes(listActions[index]._id)){
                isCheckedAll = false;
                break;
            }
        }
        this.isAllChecked = isCheckedAll;
    }

    toggleCheckItem(val: boolean, id: string, key: string){
        if(val){
            this.listChecked.set(key, [...this.listChecked.get(key), id]);
        }
        else this.listChecked.set(key, [...this.listChecked.get(key).filter(_id => _id != id)]);
        this.updateCheckAll(key);
    }

    toggleCheckAllItems(val: boolean, key: string){
        if(!val) this.resetListChecked(key);
        else {
            this.listChecked.set(key, this.mapOfActions.get(key).list.map(action => action._id));
        }
    }

    isChecked(id: string, key: string){
        return this.listChecked.get(key).includes(id);
    }

    getListRoles(){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['get-list'])) {
            this.roleService.getListRoles('', 0, 1000).subscribe(data => {
                this.listRoles = data.results;
            })
        } else this.toast.error(this.translate.instant('my-ml.role.message.not-allow-get-list'));
    }

    onChangePageActions(key: string, evt: PageEvent){
        const curr = this.mapOfActions.get(key);
        this.mapOfActions.set(key, {...curr, page: evt.pageIndex, displayList: curr.list.filter((_, ind) => ind >= evt.pageIndex*curr.size && ind < (evt.pageIndex+1)*curr.size)});
    }

    onChangePageModuleActions(evt: PageEvent){
        this.pageModuleActions = evt.pageIndex;
        this.setListOfKeysToShow();
    }
    
    setListOfKeysToShow(){
        this.listOfKeys = Array.from(this.mapOfActions.keys()).filter((_, ind) => ind >= this.pageModuleActions*this.sizeModuleActions && ind < (this.pageModuleActions+1)*this.sizeModuleActions);
    }

    openSelectModules(){
        this.dialogService.open(SelectModuleComponent, {
            data: {
                selectedModules: Array.from(this.mapOfActions.keys())
            },
            width: "800px"
        })
        .afterClosed().subscribe((res: Module[]) => {
            if(res){
                const listSelectedIds = res.map(m => m._id);
                // delete the unselected
                Array.from(this.mapOfActions.keys()).forEach(key => {
                    if(!listSelectedIds.includes(key)) {
                        this.mapOfActions.delete(key);
                        this.listChecked.delete(key);
                    }
                })
                // add new selected
                listSelectedIds.forEach((newKey, ind) => {
                    if(!this.mapOfActions.has(newKey)){
                        this.mapOfActions.set(newKey, {
                            displayList: [],
                            list: [],
                            module: res[ind],
                            page: 0,
                            size: CONSTS.page_size,
                            total: 0
                        })
                        this.resetListChecked(newKey);
                    }
                })
                // reset to page 0
                this.pageModuleActions = 0;
                this.setListOfKeysToShow();
            }
        })
    }

    openSelectActions(moduleKey: string){
        this.dialogService.open(SelectActionComponent, {
            data: {
                selectedActions: this.mapOfActions.get(moduleKey).list.map(act => act._id)
            },
            width: "800px"
        })
        .afterClosed().subscribe((res: Action[]) => {
            if(res){
                // reset new list for current module key
                this.mapOfActions.set(moduleKey, {
                    list: res,
                    displayList: res.filter((_, ind) => ind >= 0 && ind < CONSTS.page_size ),
                    module: this.mapOfActions.get(moduleKey).module,
                    page: 0,
                    size: CONSTS.page_size,
                    total: res.length
                })
                this.resetListChecked(moduleKey);
            }
        })
    }
}