import { Component, ElementRef, Input, OnInit, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CONSTS } from 'app/consts';
import { Category } from 'app/model/category.model';
import { Icon } from 'app/model/icon.model';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../common.service';
import { IconSelectionComponent } from '../../icon-selection/icon-selection.component';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'ml-category',
    templateUrl: 'category.component.html',
    styleUrls: ['./category.component.scss']
})

export class CategoryComponent implements OnInit, OnChanges, OnDestroy {
    constructor(
        private iconSelectDialog: MatDialog, 
        private commonService: CommonService, 
        private toast: ToastrService,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { }

    listCategories: Category[] = [];
    listCategoriesSaved: Category[] = [];
    listChecked: boolean[] = [];
    indexEditting: number = -1;
    indexHovering: number = -1;
    nameEditting: string = "";
    pageSize: number = CONSTS.page_size;
    pageSizeOptions: number[] = CONSTS.page_size_options;
    page: number = 0;
    total: number = 0;
    iconSelectionDialogRef: MatDialogRef<IconSelectionComponent>;
    loading: boolean = true;
    @Input() permissionChecked = new Subject<boolean>();
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    @ViewChild("editInput") editInput: ElementRef;

    @Input() icons: Icon[];
    /**
     * receive search signal from parent
     */
    @Input() search: string;

    ngOnInit() {
        this.permissionChecked.pipe(takeUntil(this.destroy$)).subscribe((checked) => {
            if(checked) this.getDataCategories()
        })
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.search && !changes.search.isFirstChange()) {
            this.getDataCategories();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.authorService.allowActionsReady$.next(false);
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
        let tempList = JSON.parse(JSON.stringify(this.listCategories));
        tempList[this.indexEditting] = this.listCategoriesSaved[this.indexEditting];
        this.listCategories = [...tempList];

        this.indexEditting = index;
        this.nameEditting = this.listCategories[index].name;
        this.indexHovering = -1;
        setTimeout(() => {
            this.editInput.nativeElement.focus();
        })
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
            this.toast.success(CONSTS.messages.update_category_success);
        }, error => {
            this.toast.error(CONSTS.messages.update_category_fail);
            console.error(error);
        })
    }

    renewListChecked() {
        let tempChecked: boolean[] = [];
        for (let i = 0; i < this.listCategories.length; i++) {
            tempChecked.push(false);
        }
        this.listChecked = [...tempChecked];
    }

    getDataCategories() {
        if(this.authorService.isAuthorized(APP_ACTIONS.category.list)) {
            this.loading = true;
            this.commonService.getListCategories(this.search, this.page, this.pageSize).subscribe(res => {
                this.listCategories = [...res.results];
                this.total = res.total;
                setTimeout(() => {
                    this.renewListChecked();
                    this.updatePreviousState();
                });            
                this.loading = false;
            }, () => {
                this.loading = false;
                this.listCategories = [];
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.category.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    onPageEvent(evt: PageEvent){
        this.page = evt.pageIndex;
        this.pageSize = evt.pageSize;
        this.getDataCategories();
    }

    editCategoryIcon(index: number) {
        if (this.indexEditting == index) {
            let currentCategory = this.listCategories[index];
            this.iconSelectionDialogRef = this.iconSelectDialog.open(IconSelectionComponent, {
                data: {
                    icons: [...this.icons],
                    currentPath: currentCategory.icon.path
                }
            });
            this.iconSelectionDialogRef.afterClosed().subscribe((data: string) => {
                if (data) {
                    let tempList = JSON.parse(JSON.stringify(this.listCategories));                    
                    let icon = this.icons.filter(i => i.path === data)[0];
                    tempList[index].icon = icon;
                    this.listCategories = [...tempList];
                }
            });
        }
    }

    /**
     * call this function after saving data
     * store the state before the showing list is modified and restore after if needed
     */
    updatePreviousState() {
        let temp = JSON.parse(JSON.stringify(this.listCategories));
        this.listCategoriesSaved = [...temp];
    }
    /* #endregion */
}