import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Category } from 'app/model/category.model';
import { CommonService } from '../common/common.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { ToastrService } from 'ngx-toastr';
import { APP_ACTIONS } from 'app/actions';

interface SelectedCategory {
    categoryId: string
}

@Component({
    selector: 'category-select',
    templateUrl: 'category-select.component.html',
    styleUrls: ['category-select.component.scss']
})

export class CategorySelectComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Partial<SelectedCategory>,
        private ref: MatDialogRef<CategorySelectComponent>,
        private commonService: CommonService,
        private toast: ToastrService,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { }

    ngOnInit() { 
        this.getDataCategories();
    }

    title: string = "Chọn chủng loại";
    search: string = "";
    categories: Category[] = [];
    allCategories: Category[] = [];
    selectedCategory: Partial<Category>;
    loading: boolean = false;
    selectedFilter: 0 | 1 = 0;

    select(category: Category){
        this.selectedCategory = category;
    }

    save(){
        this.ref.close(this.selectedCategory);
    }

    close(){
        this.ref.close();
    }

    getDataCategories() {
        if(this.authorService.isAuthorized(APP_ACTIONS.category.list)) {
            this.loading = true;
            this.commonService.getListCategories(this.search).subscribe(res => {
                this.allCategories = [...res.results];
                this.filterCategories();
                if(this.data && this.data.categoryId){
                    this.selectedCategory = res.results.find(x => x._id == this.data.categoryId) ? res.results.find(x => x._id == this.data.categoryId): {_id: ''}
                }
                else {
                    this.selectedCategory = {
                        _id: ''
                    }
                }
                this.loading = false;
            }, (err) => {
                this.loading = false;
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.category.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    filterCategories(){
        this.categories = this.allCategories.filter(c => c.transactionType == this.selectedFilter)
    }
}