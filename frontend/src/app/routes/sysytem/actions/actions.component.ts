import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Action } from 'app/model/action.model';
import { CONSTS, UNKNOWN_ERROR_MESSAGE } from 'app/consts';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ToastrService } from 'ngx-toastr';
import { PageEvent } from '@angular/material/paginator';
import { ActionDialogComponent } from './action-dialog.component';
import { ActionService } from './action.service';
import { checkIsCheckAll } from '@shared';
import { AuthorizationService } from '@shared/services/authorization.service';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { APP_ACTIONS } from 'app/actions';
import { CustomHttpResponseError } from 'app/model/system/response-error.model';

@Component({
    selector: 'actions',
    templateUrl: 'actions.component.html',
    styleUrls: ['actions.component.scss']
})

export class ActionMngComponent implements OnInit, OnDestroy {
    constructor(
        private actionService: ActionService,
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
            if(checked) this.searchActions();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.authorService.allowActionsReady$.next(false);
    }

    listActions: Partial<Action>[] = [];
    searchKey: string = '';
    displayedColumns: string[] = ['checkbox', 'system.action.action-name', 'system.action.action-code', 'system.common.description', 'system.common.date-created', 'system.common.status', 'system.common.actions'];
    columnProps: string[] = ['checkbox', 'title','code', 'description', 'dateCreated', 'status', 'actions'];
    loading: boolean = false;
    listChecked: Map<string, Partial<Action>> = new Map<string, Partial<Action>>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    permissionChecked = new Subject<boolean>();
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    getListActions(){
        if(this.authorService.isAuthorized(APP_ACTIONS.action['get-list'])) {
            this.actionService.getListActions(this.searchKey, this.page, this.pageSize).subscribe(res => {
                this.loading = false;
                this.listActions = res.results;
                this.total = res.total;
                this.updateCheckAll();
                if(!this.listActions.length) this.isAllChecked = false;
            }, err => {
                this.loading = false;
            });
        } else {
            this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchActions(){
        this.loading = true;
        this.getListActions();
    }

    open(action?: Partial<Action>, evt?: Event){
        this.dialogService.open(ActionDialogComponent, {
            data: {
                id: action ? action._id: null
            },
            width: '400px'
        })
        .afterClosed().subscribe((res: string) => {
            if(res){
                this.searchActions();
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
        if(this.authorService.isAuthorized(APP_ACTIONS.action.delete)) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.action.delete-title'),
                    message: this.translate.instant('system.action.delete-many-content', { count: this.getNumOfSelected() })
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    this.actionService.deleteAction(Array.from(this.listChecked.keys()))
                    .subscribe(res => {
                        this.loading = false;
                        this.resetListChecked();
                        this.toast.success(this.translate.instant('system.action.delete-success'));
                        this.searchActions();
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant('system.action.delete-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-delete'));
    }

    onChangePage(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.searchActions();
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
        this.isAllChecked = checkIsCheckAll(Array.from(this.listChecked.keys()), this.listActions);
    }

    toggleCheckItem(val: boolean, id: string){
        if(val) this.listChecked.set(id, this.listActions.find(r => r._id == id));
        else this.listChecked.delete(id);
        this.updateCheckAll();
    }

    toggleCheckAllItems(val: boolean){
        if(val){
            this.listActions.forEach(action => {
                if(!this.listChecked.has(action._id)) this.listChecked.set(action._id, action);
            });
        } else this.resetListChecked();
    }

    isChecked(id: string){
        return this.listChecked.has(id);
    }

    deleteSingle(action: Partial<Action>){
        if(this.authorService.isAuthorized(APP_ACTIONS.action.delete)) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant('system.action.delete-title'),
                    message: this.translate.instant('system.action.delete-one-content', { name: action.title }),
                }
            })
            .afterClosed().subscribe((isConfirmed?: boolean) => {
                if(isConfirmed){
                    this.loading = true;
                    this.actionService.deleteAction([action._id]).subscribe(() => {
                        this.toast.success(this.translate.instant('system.action.delete-success'));
                        this.loading = false;
                        this.searchActions();
                        if(this.listChecked.has(action._id)) this.listChecked.delete(action._id);
                    }, () => this.loading = false);
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-delete'));
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

    changeStatus(action: Partial<Action>){
        if(this.authorService.isAuthorized(APP_ACTIONS.action['update-status'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant(action.status ? 'system.action.lock-title': 'system.action.unlock-title'),
                    message: this.translate.instant(action.status ? 'system.action.lock-content': 'system.action.unlock-content', { name: action.title }),
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    const newStatus = action.status ? 0: 1;
                    this.actionService.changeStatusAction([action._id], newStatus)
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success(this.translate.instant(action.status ? 'system.action.lock-success': 'system.action.unlock-success'));
                        this.searchActions();
                        this.updateListCheckedAfterStatusChanged([action._id], newStatus);
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant(action.status ? 'system.action.lock-failed': 'system.action.unlock-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-update-status'));
    }

    changeStatusSelected(currStatus: 0 | 1){
        if(this.authorService.isAuthorized(APP_ACTIONS.action['update-status'])) {
            this.dialogService.open(ConfirmDeletionComponent, {
                data: {
                    title: this.translate.instant(currStatus ? 'system.action.lock-title': 'system.action.unlock-title'),
                    message: this.translate.instant(currStatus ? 'system.action.lock-many-content': 'system.action.unlock-many-content', { count: this.getNumOfSelected() }),
                }
            })
            .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.loading = true;
                    const newStatus = currStatus ? 0: 1;
                    this.actionService.changeStatusAction(Array.from(this.listChecked.keys()), newStatus)
                    .subscribe(res => {
                        this.loading = false;
                        this.toast.success(this.translate.instant(currStatus ? 'system.action.lock-success': 'system.action.unlock-success'));
                        this.searchActions();   
                        this.resetListChecked();             
                    }, (err: CustomHttpResponseError) => {
                        this.loading = false;
                        if(err.error.message === UNKNOWN_ERROR_MESSAGE) this.toast.error(this.translate.instant(currStatus ? 'system.action.lock-failed': 'system.action.unlock-failed'));
                        else this.toast.error(this.translate.instant(err.error.message));
                    });                
                }
            });
        } else this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-update-status'));
    }
}