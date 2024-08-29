import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Action } from 'app/model/action.model';
import { CONSTS } from 'app/consts';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ToastrService } from 'ngx-toastr';
import { PageEvent } from '@angular/material/paginator';
import { ActionDialogComponent } from './action-dialog.component';
import { ActionService } from './action.service';
import { checkIsCheckAll } from '@shared';
import { AuthorizationService } from '@shared/services/authorization.service';

@Component({
    selector: 'actions',
    templateUrl: 'actions.component.html',
    styleUrls: ['actions.component.scss']
})

export class ActionMngComponent implements OnInit, AfterViewInit {
    constructor(
        private actionService: ActionService,
        private dialogService: MatDialog,
        private toast: ToastrService,
        private authorService: AuthorizationService
    ) { 
        this.authorService.getAllowActionsOnModule(location.pathname).subscribe(({actions}) => {
            this.authorService.allowActionsChange$.next(actions);
        })
    }

    ngOnInit() { 
        this.searchActions()
    }

    ngAfterViewInit(): void {
        this.renderFinished = true;
    }

    listActions: Partial<Action>[] = [];
    searchKey: string = "";
    displayedColumns: string[] = ['checkbox', 'Tên hành động', 'Mã hành động', 'Mô tả', 'Ngày tạo', 'Trạng thái', 'Thao tác'];
    columnProps: string[] = ['checkbox', 'title','code', 'description', 'dateCreated', 'status', 'actions'];
    loading: boolean = false;
    listChecked: Map<string, Partial<Action>> = new Map<string, Partial<Action>>();
    total: number = 0;
    pageSize: number = CONSTS.page_size;
    page: number = 0;
    isAllChecked: boolean = false;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    renderFinished: boolean = false;

    getListActions(){
        this.actionService.getListActions(this.searchKey, this.page, this.pageSize).subscribe(res => {
            this.loading = false;
            this.listActions = res.results;
            this.total = res.total;
            this.updateCheckAll();
            if(!this.listActions.length) this.isAllChecked = false;
        }, err => {
            this.loading = false;
        })
    }

    resetListChecked(){
        this.listChecked.clear();
    }

    searchActions(){
        this.loading = true;
        this.getListActions()
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
                title: "Xác nhận xóa hành động?",
                message: `Xóa vĩnh viễn ${this.getNumOfSelected()} hành động?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                this.actionService.deleteAction(Array.from(this.listChecked.keys()))
                .subscribe(res => {
                    this.loading = false;
                    this.resetListChecked();
                    this.toast.success("Xóa vĩnh viễn hành động thành công");
                    this.searchActions();
                }, err => {
                    this.loading = false;
                })                
            }
        })
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
            })
        } else this.resetListChecked();
    }

    isChecked(id: string){
        return this.listChecked.has(id);
    }

    deleteSingle(action: Partial<Action>){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận xóa hành động`,
                message: `Xóa hành động '${action.title}'?`
            }
        })
        .afterClosed().subscribe((isConfirmed?: boolean) => {
            if(isConfirmed){
                this.loading = true;
                this.actionService.deleteAction([action._id]).subscribe(() => {
                    this.toast.success(`Xóa hành động thành công`);
                    this.loading = false;
                    this.searchActions();
                    if(this.listChecked.has(action._id)) this.listChecked.delete(action._id);
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

    changeStatus(action: Partial<Action>){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận ${action.status ? '': 'mở'} khóa hành động?`,
                message: `${action.status ? 'Khóa': 'Mở khóa'} hành động ${action.title}?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                const newStatus = action.status ? 0: 1;
                this.actionService.changeStatusAction([action._id], newStatus)
                .subscribe(res => {
                    this.loading = false;
                    this.toast.success(`${action.status ? 'Khóa': 'Mở khóa'} hành động thành công`);
                    this.searchActions();
                    this.updateListCheckedAfterStatusChanged([action._id], newStatus)
                }, err => {
                    this.loading = false;
                })                
            }
        })
    }

    changeStatusSelected(currStatus: 0 | 1){
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: `Xác nhận ${currStatus ? '': 'mở'} khóa hành động?`,
                message: `${currStatus ? 'Khóa': 'Mở khóa'} ${this.getNumOfSelected()} hành động?`
            }
        })
        .afterClosed().subscribe((isConfirmed: boolean | undefined) => {
            if (isConfirmed) {
                this.loading = true;
                const newStatus = currStatus ? 0: 1;
                this.actionService.changeStatusAction(Array.from(this.listChecked.keys()), newStatus)
                .subscribe(res => {
                    this.loading = false;
                    this.toast.success(`${currStatus ? 'Khóa': 'Mở khóa'} hành động thành công`);
                    this.searchActions();   
                    this.resetListChecked();             
                }, err => {
                    this.loading = false;
                })                
            }
        })
    }
}