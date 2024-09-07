import { Component, Inject, OnInit } from '@angular/core';
import { RoleService } from '../role.service';
import { Role } from 'app/model/role.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { ToastrService } from 'ngx-toastr';
import { APP_ACTIONS } from 'app/actions';

@Component({
    selector: 'choose-user-role',
    templateUrl: 'choose-user-role.component.html',
    styles: [`
        .user-role-list {
            display: flex;
            flex-direction: column;
            row-gap: 10px;
            align-items: flex-start;
        }
    `]
})

export class ChooseUserRoleComponent implements OnInit {
    constructor(
        private roleService: RoleService,
        @Inject(MAT_DIALOG_DATA) public data: { selectedRole: string },
        private authorService: AuthorizationService,  
        private toast: ToastrService,  
        private translate: TranslateService,
        private dialogRef: MatDialogRef<ChooseUserRoleComponent>
    ) { }

    ngOnInit() { 
        if(this.data && this.data.selectedRole) this.selectedRole = this.data.selectedRole;
        this.getListRoles();
    }

    loading: boolean = true;
    listRoles: Partial<Role>[] = [];
    selectedRole: string | undefined;
    title: string = "Cấu hình vai trò người dùng"

    getListRoles(){
        if(this.authorService.isAuthorized(APP_ACTIONS.role['get-list'])) {
            this.roleService.getListRoles('', 0, 1000, {status: 1}).subscribe(res => {
                this.listRoles = res.results;
                this.loading = false;
            }, () => {
                this.loading = false;
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.role.message.not-allow-get-list'));
            this.loading = false;
        }
    }

    close(selectedRoleId?: string){
        if(selectedRoleId){
            const selectedRole = this.listRoles.find(role => role._id == selectedRoleId);
            if(selectedRole){
                this.dialogRef.close(selectedRole);    
            } else this.dialogRef.close();
        }
        else {
            this.dialogRef.close();
        }
    }
}