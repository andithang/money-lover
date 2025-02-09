import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Role } from 'app/model/role.model';
import { CONSTS, UNKNOWN_ERROR_MESSAGE } from 'app/consts';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ToastrService } from 'ngx-toastr';
import { PageEvent } from '@angular/material/paginator';
import { RoleDialogComponent } from './role-dialog.component';
import { RoleService } from './role.service';
import { checkIsCheckAll } from '@shared';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { takeUntil, Subject } from 'rxjs';
import { CustomHttpResponseError } from 'app/model/system/response-error.model';

@Component({
    selector: 'roles',
    templateUrl: 'roles.component.html',
    styleUrls: ['roles.component.scss']
})

export class RoleMngComponent implements OnInit, OnDestroy {
    constructor(
        private roleService: RoleService,
        private dialogService: MatDialog,
        private toast: ToastrService,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { 
        this.authorService.getAllowActionsOnModule(location.pathname).subscribe(({actions}) => {
            this.authorService.allowActionsChange$.next(actions);
            this.permissionChecked.next(true);
        }, () => this.permissionChecked.next(true));
    }

    ngOnInit() {         
        this.permissionChecked.pipe(takeUntil(this.destroy$)).subscribe((checked) => {
            if(checked) this.searchRoles();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.authorService.allowActionsReady$.next(false);
    }

    listRoles: Partial<Role>[] = [];
    searchKey: string = '';
    displayedColumns: string[] = ['checkbox', 'system.role.role-name', 'system.role.role-code', 'system.common.description', 'system.common.date-created', 'system.common.status', 'system.common.actions'];
    columnProps: string[] = ['checkbox', 'title','code', 'description', 'dateCreated', 'status', 'actions'];
    loading: boolean = false;
    listChecked: Map<string, Partial<Role>> = new Map<string, Partial<Role>>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    permissionChecked = new Subject<boolean>();
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    getListRoles(){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['get-list'])) {
            this.roleService.getListRoles(this.searchKey, this.page, this.pageSize).subscribe(res => {
                this.loading = false;
                this.listRoles = res.results;
                this.total = res.total;
                this.updateCheckAll();
                if(!this.listRoles.length) this.isAllChecked = false;
            }, err => {
                this.loading = false;
            });
        } else {
            this.toast.error(this.translate.instant('my-ml.role.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchRoles(){
        this.loading = true;
        this.getListRoles();
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
        });
        if(evt){
            evt.stopPropagation();
        }
    }

    getNumOfSelected(){
        return this.listChecked.size;
    }

    delete(){  
        if(this.authorService.isAuthorized(APP_ACTIONS.role['delete-many'])) { 
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.role.delete-title'),
                    message: this.translate.instant('system.role.delete-many-content', { count: this.getNumOfSelected() })
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.roleService.deleteRole(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.loading = false;
                        this.resetListChecked();
                        this.toast.success(this.translate.instant('system.role.delete-success'));
                        this.searchRoles();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.role.delete-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.role.message.not-allow-delete'));
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
            });
        } else this.resetListChecked();
    }

    isChecked(id: string){
        return this.listChecked.has(id);
    }

    deleteSingle(role: Partial<Role>){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['delete-one'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.role.delete-title'),
                    message: this.translate.instant('system.role.delete-one-content', { name: role.title }),
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.roleService.deleteRole([role._id]).subscribe(() => {
                        this.toast.success(this.translate.instant('system.role.delete-success'));
                        this.loading = false;
                        this.searchRoles();
                        if(this.listChecked.has(role._id)) this.listChecked.delete(role._id);
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.role.delete-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.role.message.not-allow-delete'));
    }

    updateListCheckedAfterStatusChanged(ids: string[], status: 0 | 1){
        ids.forEach(id => {
            if(this.listChecked.has(id)){
                this.listChecked.set(id, {
                    ...this.listChecked.get(id),
                    status
                });
            }
        });
    }

    changeStatus(role: Partial<Role>){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['update-status'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant(role.status ? 'system.role.lock-title': 'system.role.unlock-title'),
                    message: this.translate.instant(role.status ? 'system.role.lock-content': 'system.role.unlock-content', { name: role.title }),
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    const newStatus = role.status ? 0: 1;
                    this.roleService.changeStatusRole([role._id], newStatus)
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success(this.translate.instant(role.status ? 'system.role.lock-success': 'system.role.unlock-success'));
                        this.searchRoles();
                        this.updateListCheckedAfterStatusChanged([role._id], newStatus);
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant(role.status ? 'system.role.lock-failed': 'system.role.unlock-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.role.message.not-allow-update-status'));
    }

    changeStatusSelected(currStatus: 0 | 1){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['update-status'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant(currStatus ? 'system.role.lock-title': 'system.role.unlock-title'),
                    message: this.translate.instant(currStatus ? 'system.role.lock-many-content': 'system.role.unlock-many-content', { count: this.getNumOfSelected() }),
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    const newStatus = currStatus ? 0: 1;
                    this.roleService.changeStatusRole(Array.from(this.listChecked.keys()), newStatus)
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success(this.translate.instant(currStatus ? 'system.role.lock-success': 'system.role.unlock-success'));
                        this.searchRoles();       
                        this.resetListChecked();             
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant(currStatus ? 'system.role.lock-failed': 'system.role.unlock-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });            
        } else this.toast.error(this.translate.instant('my-ml.role.message.not-allow-update-status'));
    }
}