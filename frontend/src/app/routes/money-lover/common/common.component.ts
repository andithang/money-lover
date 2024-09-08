import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { IconService } from '@shared';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { CONSTS } from 'app/consts';
import { Category, NewCategory } from 'app/model/category.model';
import { Icon } from 'app/model/icon.model';
import { NewWalletType } from 'app/model/wallet-type.model';
import { ToastrService } from 'ngx-toastr';
import { CategoryDialogComponent } from './category/category-dialog.component';
import { CategoryComponent } from './category/category.component';
import { CommonService } from './common.service';
import { IconAddComponent } from './icon-mng/icon-add-dialog.component';
import { WalletTypeDialogComponent } from './wallet-type/wallet-type-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'common',
    templateUrl: 'common.component.html'
})

export class MoneyCommonComponent implements OnInit {
    constructor(
        private commonService: CommonService, 
        private iconService: IconService, 
        private dialog: MatDialog, 
        private toast: ToastrService,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { 
        this.authorService.getAllowActionsOnModule(location.pathname).subscribe(({actions}) => {
            this.authorService.allowActionsChange$.next(actions);
            this.permissionChecked.next(true);
        }, () => this.permissionChecked.next(true))
    }

    icons: Icon[] = [];
    searchCategoryKey: string = "";
    searchWalletTypeKey: string = "";
    /**
     * used to fire search evt to category comp
     */
    search: string = "";
    /**
     * used to fire search evt to wallet-type comp
     */
    searchType: string = "";
    newCategoryDialog: MatDialogRef<CategoryDialogComponent>;
    newWalletTypeDialog: MatDialogRef<WalletTypeDialogComponent>;
    confirmDeletionDialog: MatDialogRef<ConfirmDeletionComponent>;
    dialogAdd: MatDialogRef<IconAddComponent>;
    permissionChecked = new Subject<boolean>();
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    @ViewChild('categories') categories: ElementRef;
    @ViewChild('walletTypes') walletTypes: ElementRef;
    @ViewChild('iconsMng') iconsMng: ElementRef;

    ngOnInit() {
        this.permissionChecked.pipe(takeUntil(this.destroy$)).subscribe((checked) => {
            if(checked) this.getListIcons()
        })
    }

    getListIcons() {
        if(this.authorService.isAuthorized(APP_ACTIONS.icon.list)) {
            this.commonService.getListData("icon", {})
                .subscribe((res: Icon[]) => {
                    this.icons = [...res];
                });
        } else this.toast.error(this.translate.instant('my-ml.icon.message.not-allow-list'));
    }

    openAddCategoryDialog() {
        if(this.authorService.isAuthorized(APP_ACTIONS.category['create-admin'])) {
            this.newCategoryDialog = this.dialog.open(CategoryDialogComponent, {
                data: {
                    icons: [...this.icons]
                },
                maxWidth: 1000
            });
            this.newCategoryDialog.afterClosed().subscribe((data: NewCategory) => {
                this.iconService.getIconByPath(data.selectedIcon).subscribe((icon: Icon) => {
                    console.log({
                        name: data.categoryName,
                        icon: icon._id
                    });
                    this.commonService.insertCategory({
                        name: data.categoryName,
                        icon: icon._id,
                        transactionType: data.transactionType
                    }).subscribe(res => {
                        this.toast.success(CONSTS.messages.insert_category_success);
                        // trigger reload list categories
                        if (this.searchCategoryKey.trim()) {
                            this.searchCategoryKey = "";
                            this.searchCategories();
                        }
                        else {
                            let comp: any = this.categories;
                            comp.getDataCategories();
                        }
                    }, error => {
                        this.toast.error(CONSTS.messages.insert_category_fail);
                    })
                }, error => {
                    this.toast.error(CONSTS.messages.icon_not_found)
                })
            })
        } else this.toast.error(this.translate.instant('my-ml.category.message.not-allow-create-admin'));
    }

    openAddWalletTypeDialog() {
        if(this.authorService.isAuthorized(APP_ACTIONS.wallettype.create)) {
            this.newWalletTypeDialog = this.dialog.open(WalletTypeDialogComponent, {
                data: {
                    icons: [...this.icons]
                },
                maxWidth: 1000
            });
            this.newWalletTypeDialog.afterClosed().subscribe((data: NewWalletType) => {
                this.iconService.getIconByPath(data.selectedIcon).subscribe((icon: Icon) => {
                    console.log({
                        name: data.walletTypeName,
                        icon: icon._id
                    });
                    this.commonService.insertWalletType({
                        name: data.walletTypeName,
                        icon: icon._id
                    }).subscribe(res => {
                        this.toast.success(CONSTS.messages.insert_walettype_success);
                        // trigger reload list categories
                        if (this.searchWalletTypeKey.trim()) {
                            this.searchWalletTypeKey = "";
                            this.searchWalletTypes();
                        }
                        else {
                            let comp: any = this.walletTypes;
                            comp.getDataWalletTypes();
                        }
                    }, error => {
                        this.toast.error(CONSTS.messages.insert_walettype_fail);
                    })
                }, error => {
                    this.toast.error(CONSTS.messages.icon_not_found)
                })
            })
        } else this.toast.error(this.translate.instant('my-ml.wallettype.message.not-allow-create'));
    }

    openAddIconDialog() {
        if(this.authorService.isAuthorized(APP_ACTIONS.icon.upload)) {
            this.dialogAdd = this.dialog.open(IconAddComponent, {
                width: '300px'
            });
            this.dialogAdd.afterClosed().subscribe((data: boolean | undefined) => {
                if (data) {
                    this.getListIcons();
                }
            })
        } else this.toast.error(this.translate.instant('my-ml.icon.message.not-allow-upload'));
    }

    searchCategories() {
        this.search = this.searchCategoryKey;
    }

    deleteCategories() {
        if(this.authorService.isAuthorized(APP_ACTIONS.category['delete-admin'])) {
            let comp: any = this.categories;
            let catesToDelete = comp.listCategoriesSaved.filter((cate, ind) => {
                return comp.listChecked[ind];
            });
            if (catesToDelete.length > 0) {
                this.confirmDeletionDialog = this.dialog.open(ConfirmDeletionComponent, {
                    data: {
                        title: "Xác nhận xóa chủng loại?",
                        message: `Xóa ${catesToDelete.length} chủng loại?`
                    }
                })
                this.confirmDeletionDialog.afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                    if (isConfirmed) {
                        this.commonService.deleteCategories({ ids: catesToDelete.map((c: Category) => c._id), isAdmin: true }).subscribe(res => {
                            this.toast.success(CONSTS.messages.delete_category_success);
                            // trigger reload list categories
                            if (this.searchCategoryKey.trim()) {
                                this.searchCategoryKey = "";
                                this.searchCategories();
                            }
                            else {
                                let comp: any = this.categories;
                                comp.getDataCategories();
                            }
                        }, err => {
                            console.error(err);
                            this.toast.error(CONSTS.messages.delete_category_fail);
                        })
                    }
    
                })
            }
            else {
                this.toast.warning(CONSTS.select_to_delete_category);
            }
        } else this.toast.error(this.translate.instant('my-ml.category.message.not-allow-delete'));
    }

    searchWalletTypes() {
        this.searchType = this.searchWalletTypeKey;
    }

    deleteWalletTypes() {
        if(this.authorService.isAuthorized(APP_ACTIONS.wallettype.delete)) {
            let comp: any = this.walletTypes;
            let typesToDelete = comp.listWalletTypesSaved.filter((cate, ind) => {
                return comp.listChecked[ind];
            });
            if (typesToDelete.length > 0) {
                this.confirmDeletionDialog = this.dialog.open(ConfirmDeletionComponent, {
                    data: {
                        title: "Xác nhận xóa loại ví?",
                        message: `Xóa ${typesToDelete.length} loại ví?`
                    }
                })
                this.confirmDeletionDialog.afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                    if (isConfirmed) {
                        this.commonService.deleteWalletTypes({ ids: typesToDelete.map((c: Category) => c._id) }).subscribe(res => {
                            this.toast.success(CONSTS.messages.delete_walettype_success);
                            // trigger reload list walletTypes
                            if (this.searchWalletTypeKey.trim()) {
                                this.searchWalletTypeKey = "";
                                this.searchWalletTypes();
                            }
                            else {
                                let comp: any = this.walletTypes;
                                comp.getDataWalletTypes();
                            }
                        }, err => {
                            console.error(err);
                            this.toast.error(CONSTS.messages.delete_walettype_fail);
                        })
                    }
    
                })
            }
            else {
                this.toast.warning(CONSTS.select_to_delete_wallet_type);
            }
        } else this.toast.error(this.translate.instant('my-ml.wallettype.message.not-allow-delete'));
    }

    deleteIcon() {
        if(this.authorService.isAuthorized(APP_ACTIONS.icon.delete)) {
            let comp: any = this.iconsMng;
            let iconsToDelete = this.icons.filter((i, ind) => {
                return comp.listChecked[ind];
            })
            if (iconsToDelete.length > 0) {
                this.confirmDeletionDialog = this.dialog.open(ConfirmDeletionComponent, {
                    data: {
                        title: "Xác nhận xóa icons?",
                        message: `Xóa ${iconsToDelete.length} ${iconsToDelete.length > 1 ? 'icons' : 'icon'}?`
                    }
                })
                this.confirmDeletionDialog.afterClosed().subscribe((isConfirmed: boolean | undefined) => {
                    if (isConfirmed) {
                        this.commonService.deleteIcon({ ids: iconsToDelete.map(i => i._id), paths: iconsToDelete.map(i => i.path) }).subscribe(res => {
                            this.toast.success(CONSTS.messages.delete_icon_success);
                            this.getListIcons();
                            iconsToDelete.forEach(ic => {
                                sessionStorage.removeItem(ic.path);
                            })
                        }, err => {
                            console.error(err);
                            this.toast.error(CONSTS.messages.delete_icon_fail);
                        })
                    }
    
                })
            } else {
                this.toast.warning(CONSTS.select_to_delete_icon);
            }
        } else this.toast.error(this.translate.instant('my-ml.icon.message.not-allow-delete'));
    }

    startLoadIcons: boolean = false;
    onChangeTabIndex(tabIndex: number){
        if(tabIndex == 1 && !this.startLoadIcons){ //icons tab
            this.startLoadIcons = true;
        }
    }
}