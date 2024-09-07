import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Role } from 'app/model/role.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { RoleService } from './role.service';
import { ToastrService } from 'ngx-toastr';
import { trim } from '@shared';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';

@Component({
    selector: 'role-dialog',
    templateUrl: 'role-dialog.component.html',
    styleUrls: ['role-dialog.component.scss']
})

export class RoleDialogComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { id?: string },
        private roleService: RoleService,
        private toast: ToastrService,
        private dialogRef: MatDialogRef<RoleDialogComponent>,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { }

    trim = trim;

    ngOnInit() {
        // update
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.role['get-one'])) {
                this.roleService.getRole(this.data.id).subscribe(res => {
                    this.role = res;
                    this.roleForm.setValue({
                        title: res.title,
                        code: res.code,                    
                        description: res.description,                    
                    })
                }, (err) => {
                    console.error(err);
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.role.message.not-allow-get-one'))
            }
        }
        // create
        else {
            this.title = "Thêm mới vai trò";
            this.role = {
                title: null,
                code: null,
                description: null
            }
        }
    }

    role: Partial<Role>;
    title: string = "Chỉnh sửa vai trò";
    roleForm: FormGroup = new FormGroup({
        title: new FormControl(null, Validators.required),
        code: new FormControl(null, Validators.required),
        description: new FormControl(null),
    });

    close(msg?: Partial<Role>){
        this.dialogRef.close(msg);
    }

    getCurrentData(): Role {
        return {
            ...this.role,
            ...this.roleForm.value
        }
    }

    save(){
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.action['update'])) {
                this.roleService.updateRole(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Cập nhật vai trò thành công");
                    this.close(res);
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.role.message.not-allow-update'));
            }
        }
        else {
            if(this.authorService.isAuthorized(APP_ACTIONS.role['create'])) {
                this.roleService.addRole(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Thêm vai trò thành công");
                    this.close(res);
                })
            } else this.toast.error(this.translate.instant('my-ml.role.message.not-allow-create'));
        }
    }

    clearFormControl(name: string){
        this.roleForm.get(name).setValue(null);
    }
}