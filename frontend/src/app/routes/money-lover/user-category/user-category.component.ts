import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CONSTS } from 'app/consts';
import { Category, NewCategory } from 'app/model/category.model';
import { Icon } from 'app/model/icon.model';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../common/common.service';
import { UserCategoryService } from './user-category.service';
import { IconService } from '@shared';
import { CategoryDialogComponent } from '../common/category/category-dialog.component';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { IconSelectionComponent } from '../icon-selection/icon-selection.component';
import { PageEvent } from '@angular/material/paginator';

@Component({
    selector: 'ml-user-category',
    templateUrl: 'user-category.component.html',
    styleUrls: ['./user-category.component.scss'],
    providers: [UserCategoryService]
})

export class UserCategoryComponent implements OnInit {
    constructor(
        private iconSelectDialog: MatDialog,
        private commonService: CommonService,
        private iconService: IconService,
        private toastService: ToastrService,
        private dialog: MatDialog
    ) { }

    listCategories: Category[] = [];
    listCategoriesSaved: Category[] = [];
    listChecked: boolean[] = [];
    indexEditting: number = -1;
    indexHovering: number = -1;
    nameEditting: string = '';
    pageSize: number = 20;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    iconSelectionDialogRef: MatDialogRef<IconSelectionComponent>;
    newCategoryDialog: MatDialogRef<CategoryDialogComponent>;
    confirmDeletionDialog: MatDialogRef<ConfirmDeletionComponent>;

    @ViewChild('editInput') editInput: ElementRef;

    icons: Icon[] = [];
    search: string = '';
    page: number = 0;
    total: number = 0;
    loading: boolean = true;

    ngOnInit() {
        this.getListIcons();
        this.getDataCategories();
    }

    /* #region UI handler */
    onMouseEnterEdit(index: number) {
        this.indexHovering = index;
    }

    onMouseLeaveEdit() {
        this.indexHovering = -1;
    }
    /* #endregion */

    /* #region Logic handler */
    editName(index: number) {
        // set current category to the previous state
        const tempList = JSON.parse(JSON.stringify(this.listCategories));
        tempList[this.indexEditting] = this.listCategoriesSaved[this.indexEditting];
        this.listCategories = [...tempList];

        this.indexEditting = index;
        this.nameEditting = this.listCategories[index].name;
        this.indexHovering = -1;
        setTimeout(() => {
            this.editInput.nativeElement.focus();
        });
    }

    cancelExitEditName() {
        this.indexEditting = -1;
    }

    finishEditName(index: number) {
        this.indexEditting = -1;
        this.commonService.updateCategory({
            name: this.nameEditting,
            icon: this.listCategories[index].icon._id,
            id: this.listCategories[index]._id,
            transactionType: this.listCategories[index].transactionType
        }).subscribe(res => {
            this.getDataCategories();
            this.toastService.success(CONSTS.messages.update_category_success);
        }, error => {
            this.toastService.error(CONSTS.messages.update_category_fail);
            console.error(error);
        });
    }

    renewListChecked() {
        const tempChecked: boolean[] = [];
        for (let i = 0; i < this.listCategories.length; i++) {
            tempChecked.push(false);
        }
        this.listChecked = [...tempChecked];
    }

    getDataCategories() {
        this.loading = true;
        this.commonService.getListCategories(this.search, this.page, this.pageSize).subscribe(res => {
            this.listCategories = [...res.results];
            this.total = res.total;
            this.loading = false;
            setTimeout(() => {
                this.renewListChecked();
                this.updatePreviousState();
            });
        }, () => this.loading = false);
    }

    onPageEvent(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.getDataCategories();
    }

    getListIcons() {
        this.commonService.getListData('icon', {})
            .subscribe((res: Icon[]) => {
                this.icons = [...res];
            });
    }

    editCategoryIcon(index: number) {
        if (this.indexEditting == index) {
            const currentCategory = this.listCategories[index];
            this.iconSelectionDialogRef = this.iconSelectDialog.open(IconSelectionComponent, {
                data: {
                    icons: [...this.icons],
                    currentPath: currentCategory.icon.path
                }
            });
            this.iconSelectionDialogRef.afterClosed().subscribe((data: string) => {
                if (data) {
                    const tempList = JSON.parse(JSON.stringify(this.listCategories));
                    const icon = this.icons.filter(i => i.path === data)[0];
                    tempList[index].icon = icon;
                    this.listCategories = [...tempList];
                }
            });
        }
    }

    openAddCategoryDialog() {
        this.newCategoryDialog = this.dialog.open(CategoryDialogComponent, {
            data: {
                icons: [...this.icons]
            },
            maxWidth: 1000
        });
        this.newCategoryDialog.afterClosed().subscribe((data: NewCategory) => {
            if(data){
                this.iconService.getIconByPath(data.selectedIcon).subscribe((icon: Icon) => {
                    console.log({
                        name: data.categoryName,
                        icon: icon._id
                    });
                    this.commonService.insertCategory({
                        name: data.categoryName,
                        icon: icon._id,
                        transactionType: data.transactionType,
                        isDefault: data.isDefault
                    }).subscribe(res => {
                        this.toastService.success(CONSTS.messages.insert_category_success);
                        this.getDataCategories();
                    }, error => {
                        this.toastService.error(CONSTS.messages.insert_category_fail);
                    });
                }, error => {
                    this.toastService.error(CONSTS.messages.icon_not_found);
                });
            }
        });
    }

    deleteCategories() {
        const catesToDelete = this.listCategoriesSaved.filter((cate, ind) => {
            return this.listChecked[ind];
        });
        if (catesToDelete.length > 0) {
            this.confirmDeletionDialog = this.dialog.open(ConfirmDeletionComponent, {
                data: {
                    title: 'Xác nhận xóa chủng loại?',
                    message: `Xóa ${catesToDelete.length} chủng loại?`
                }
            });
            this.confirmDeletionDialog.afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                if (isConfirmed) {
                    this.commonService.deleteCategories({ ids: catesToDelete.map((c: Category) => c._id), isAdmin: false }).subscribe(res => {
                        this.toastService.success(CONSTS.messages.delete_category_success);
                        this.getDataCategories();
                    }, err => {
                        console.error(err);
                        this.toastService.error(CONSTS.messages.delete_category_fail);
                    });
                }

            });
        }
        else {
            this.toastService.warning(CONSTS.select_to_delete_category);
        }
    }

    /**
     * call this function after saving data
     * store the state before the showing list is modified and restore after if needed
     */
    updatePreviousState() {
        const temp = JSON.parse(JSON.stringify(this.listCategories));
        this.listCategoriesSaved = [...temp];
    }
    /* #endregion */

    showDeleteBtn(){
        return !!this.listChecked.find(checked => checked);
    }
}