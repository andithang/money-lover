import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from 'app/model/user.model';
import { UsersService } from './users.service';
import { CONSTS, UNKNOWN_ERROR_MESSAGE } from 'app/consts';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ToastrService } from 'ngx-toastr';
import { PageEvent } from '@angular/material/paginator';
import { ChooseUserRoleComponent } from '../roles/choose-user-role/choose-user-role.component';
import { Role } from 'app/model/role.model';
import { checkIsCheckAll } from '@shared';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { Subject, takeUntil } from 'rxjs';
import { CustomHttpResponseError } from 'app/model/system/response-error.model';

@Component({
    selector: 'users-list',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss']
})

export class UsersListComponent implements OnInit, OnDestroy {
    constructor(
        private usersService: UsersService,
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
            if(checked) this.searchUsers();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.authorService.allowActionsReady$.next(false);
    }

    searchKey: string = '';
    userList: Partial<User>[] = [];
    displayedColumns: string[] = ['checkbox', 'system.user.username', 'system.user.fullname', 'system.user.email', 'system.user.role', 'system.common.date-created', 'system.common.status', 'system.common.actions'];
    columnProps: string[] = ['checkbox', 'username','fullname', 'email', 'level', 'dateCreated', 'status', 'actions'];
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    listChecked: Map<string, Partial<User>> = new Map<string, Partial<User>>();
    isAllChecked: boolean = false;
    loading: boolean = false;
    permissionChecked = new Subject<boolean>();
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    addUser(){

    }

    updateListCheckedAfterUpdate(ids: string[], key: string, value: any){
        ids.forEach(id => {
            if(this.listChecked.has(id)){
                this.listChecked.set(id, {
                    ...this.listChecked.get(id),
                    [key]: value
                });
            }
        });
    }

    deactivate(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users.deactivate)) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.user.deactivate-title'),
                    message: this.translate.instant('system.user.deactivate-content', { size: this.listChecked.size })
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.usersService.deactivateUsers(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success(this.translate.instant('system.user.deactivate-success'));
                        this.searchUsers();
                        this.resetListChecked(); 
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.deactivate-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        } else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-deactivate'));
            this.loading = false;
        }
    }

    delete(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['delete-temp-many'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.user.delete-title-many'),
                    message: this.translate.instant('system.user.delete-content-many', { size: this.listChecked.size })
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.usersService.deleteUsers(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.toast.success(this.translate.instant('system.user.delete-many-success'));
                        this.loading = false;
                        this.searchUsers();
                        this.resetListChecked();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.delete-many-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-delete-temp-many'));
            this.loading = false;
        }
    }

    searchUsers(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['get-list'])) {
            this.loading = true;
            this.usersService.getListData({
                search: this.searchKey
            }).subscribe(res => {
                this.userList = res.results;
                this.total = res.total;
                this.loading = false;
                this.updateCheckAll();
            }, err => {
                this.loading = false;
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    updateCheckAll(){
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.keys()), this.userList);
    }

    toggleCheckItem(val: boolean, id: string){
        if(val) this.listChecked.set(id, this.userList.find(r => r._id == id));
        else this.listChecked.delete(id);
        this.updateCheckAll();
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    toggleCheckAllItems(val: boolean){
        if(val){
            this.userList.forEach(user => {
                if(!this.listChecked.has(user._id)) this.listChecked.set(user._id, user);
            });
        } else this.resetListChecked();
    }

    openLock(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users.unlock)) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.user.unlock-title-many'),
                    message: this.translate.instant('system.user.unlock-content-many', { size: this.listChecked.size })
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.usersService.unlockUsers(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success(this.translate.instant('system.user.unlock-many-success'));
                        this.searchUsers();
                        this.resetListChecked(); 
                    }, err => {
                        this.loading = false;
                        this.toast.error(this.translate.instant('system.user.unlock-many-failed'));
                    });                
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-unlock'));
            this.loading = false;
        }
    }

    isShowLockButton(){
        if(this.listChecked.size){
            const checkedItems = Array.from(this.listChecked.values());
            return checkedItems.length && checkedItems.map(u => u.status).find(s => s == 0) == null;
        }
        else return false;
    }

    isShowDeletePermanentButton(){
        if(this.listChecked.size){
            const checkedItems = this.userList.filter(u => this.listChecked.has(u._id));
            return checkedItems.length && !checkedItems.find(u => u.status || !u.is_delete);
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

    isShowDeleteTempButton(){
        if(this.listChecked.size){
            const checkedItems = Array.from(this.listChecked.values());
            return checkedItems.length && checkedItems.map(u => u.is_delete).find(s => s) == null;
        }
        else return false;
    }

    isShowRestoreButton(){
        if(this.listChecked.size){
            const checkedItems = Array.from(this.listChecked.values());
            return checkedItems.length && !checkedItems.find(u => u.status || !u.is_delete);
        }
        else return false;
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchUsers();
    }

    deleteSingleUser(user: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['delete-temp-one'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.user.delete-title-one'),
                    message: this.translate.instant('system.user.delete-content-one', { username: user.username })
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.deleteSingleUser(user._id).subscribe(() => {
                        this.toast.success(this.translate.instant('system.user.delete-one-success'));
                        this.loading = false;
                        this.searchUsers();
                        if(this.listChecked.has(user._id)) this.listChecked.delete(user._id);
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.delete-one-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-delete-temp-one'));
            this.loading = false;
        }
    }

    restoreUser(user?: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['restore-many'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.user.restore-title'),
                    message: user ? this.translate.instant('system.user.restore-content-one', { username: user.username }): this.translate.instant('system.user.restore-content-many', { size: this.listChecked.size })
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.restoreUsers(user ? [user._id]: Array.from(this.listChecked.keys())).subscribe(() => {
                        this.toast.success(this.translate.instant('system.user.restore-success'));
                        this.loading = false;
                        this.searchUsers();
                        if(user && this.listChecked.has(user._id)) this.listChecked.delete(user._id);
                        else if(!user) this.resetListChecked();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.restore-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-restore-many'));
            this.loading = false;
        }
    }

    deletePermanently(user?: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['delete-many-forever'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant(`system.user.delete-perm-title`),
                    message: this.translate.instant(user ? `system.user.delete-one-perm-content`: `system.user.delete-many-perm-content`, { size: this.listChecked.size, username: user.username })
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.deletePermanently(user? [user._id]: Array.from(this.listChecked.keys())).subscribe(() => {
                        this.toast.success(this.translate.instant('system.user.delete-perm-success'));
                        this.loading = false;
                        this.searchUsers();
                        if(user && this.listChecked.has(user._id)) this.listChecked.delete(user._id);
                        else if(!user) this.listChecked.clear();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.delete-perm-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-delete-many-forever'));
            this.loading = false;
        }
    }

    resetPassword(user: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['reset-password'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant(`system.error.reset-password-title`),
                    message: this.translate.instant(`system.error.reset-password-content`, { username: user.username, email: user.email })
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.resetPassword(user._id).subscribe(() => {
                        this.toast.success(this.translate.instant(`system.user.reset-password-success`));
                        this.loading = false;
                        this.searchUsers();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.reset-password-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-reset-password'));
            this.loading = false;
        }
    }

    chooseUserRole(user: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['update-user-role'])) {
            this.dialogService.open(ChooseUserRoleComponent, {
                data: {
                    selectedRole: user.role
                }
            }).afterClosed().subscribe((newRole: Partial<Role>) => {
                if(newRole){
                    this.usersService.updateUserRole(user._id, newRole._id).subscribe(() => {
                        this.toast.success(this.translate.instant('system.user.update-role-success'));
                        this.searchUsers();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.user.update-role-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });
                }
            });
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-update-user-role'));
            this.loading = false;
        }
    }
}