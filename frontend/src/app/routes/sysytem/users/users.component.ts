import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from 'app/model/user.model';
import { UsersService } from './users.service';
import { CONSTS } from 'app/consts';
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
        }, () => this.permissionChecked.next(true))
    }

    ngOnInit() {       
        this.permissionChecked.pipe(takeUntil(this.destroy$)).subscribe((checked) => {
            if(checked) this.searchUsers()
        })
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.authorService.allowActionsReady$.next(false);
    }

    searchKey: string = "";
    userList: Partial<User>[] = [];
    displayedColumns: string[] = ['checkbox', 'Username', 'Họ Tên', 'Email', 'Vai trò', 'Ngày tạo', 'Trạng thái', 'Thao tác'];
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
                })
            }
        })
    }

    deactivate(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users.deactivate)) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: "Xác nhận vô hiệu hóa tài khoản?",
                    message: `Vô hiệu ${this.listChecked.size} tài khoản?`
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.usersService.deactivateUsers(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success("Vô hiệu hóa tài khoản thành công");
                        this.searchUsers();
                        this.resetListChecked(); 
                    }, err => {
                        this.loading = false;
                        this.toast.error("Vô hiệu hóa tài khoản thất bại")
                    })                
                }
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-deactivate'));
            this.loading = false;
        }
    }

    delete(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['delete-temp-many'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: "Xác nhận xóa tài khoản?",
                    message: `Xóa vĩnh viễn ${this.listChecked.size} tài khoản?`
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.usersService.deleteUsers(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.toast.success("Xóa vĩnh viễn tài khoản thành công");
                        this.loading = false;
                        this.searchUsers();
                        this.resetListChecked();
                    }, err => {
                        this.loading = false;
                        this.toast.error("Xóa vĩnh viễn tài khoản thất bại")
                    })                
                }
            })
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
            })
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
            })
        } else this.resetListChecked();
    }

    openLock(){
        if(this.authorService.isAuthorized(APP_ACTIONS.users.unlock)) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: "Xác nhận mở khóa tài khoản?",
                    message: `Mở khóa ${this.listChecked.size} tài khoản?`
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.usersService.unlockUsers(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success("Mở khóa tài khoản thành công");
                        this.searchUsers();
                        this.resetListChecked(); 
                    }, err => {
                        this.loading = false;
                        this.toast.error("Mở khóa tài khoản thất bại")
                    })                
                }
            })
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
                    title: `Xác nhận xóa tài khoản '${user.username}'?`,
                    message: `Xóa tài khoản với username '${user.username}'?`
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.deleteSingleUser(user._id).subscribe(() => {
                        this.toast.success(`Xóa tài khoản thành công`);
                        this.loading = false;
                        this.searchUsers();
                        if(this.listChecked.has(user._id)) this.listChecked.delete(user._id);
                    }, () => this.loading = false)
                }
            })
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-delete-temp-one'));
            this.loading = false;
        }
    }

    restoreUser(user?: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['restore-many'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: `Xác nhận khôi phục tài khoản`,
                    message: user ? `Khôi phục tài khoản với username '${user.username}'?`: `Khôi phục ${this.listChecked.size} tài khoản?`
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.restoreUsers(user ? [user._id]: Array.from(this.listChecked.keys())).subscribe(() => {
                        this.toast.success(`Khôi phục ${user ? '1': this.listChecked.size} tài khoản thành công`);
                        this.loading = false;
                        this.searchUsers();
                        if(user && this.listChecked.has(user._id)) this.listChecked.delete(user._id);
                        else if(!user) this.resetListChecked();
                    }, () => this.loading = false)
                }
            })
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-restore-many'));
            this.loading = false;
        }
    }

    deletePermanently(user?: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['delete-many-forever'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: `Xác nhận xóa vĩnh viễn`,
                    message: user ? `Hành động này không thể hoàn tác. Xóa vĩnh viễn tài khoản '${user.username}'?`: `Hành động này không thể hoàn tác. Xóa vĩnh viễn ${this.listChecked.size} tài khoản?`
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.deletePermanently(user? [user._id]: Array.from(this.listChecked.keys())).subscribe(() => {
                        this.toast.success(`Xóa vĩnh viễn ${user ? '1': this.listChecked.size} tài khoản thành công`);
                        this.loading = false;
                        this.searchUsers();
                        if(user && this.listChecked.has(user._id)) this.listChecked.delete(user._id);
                        else if(!user) this.listChecked.clear();
                    }, () => this.loading = false)
                }
            })
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-delete-many-forever'));
            this.loading = false;
        }
    }

    resetPassword(user: Partial<User>){
        if(this.authorService.isAuthorized(APP_ACTIONS.users['reset-password'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: `Cài lại mật khẩu`,
                    message: `Cài lại mật khẩu cho tài khoản '${user.username}'? Mật khẩu mới sẽ được gửi về email '${user.email}'`
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.usersService.resetPassword(user._id).subscribe(() => {
                        this.toast.success(`Cài lại mật khẩu cho tài khoản thành công`);
                        this.loading = false;
                        this.searchUsers();
                    }, () => this.loading = false)
                }
            })
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
                        this.toast.success('Cập nhật vai trò người dùng thành công');
                        this.searchUsers();
                    })
                }
            })
        }  else {
            this.toast.error(this.translate.instant('my-ml.user.message.not-allow-update-user-role'));
            this.loading = false;
        }
    }
}