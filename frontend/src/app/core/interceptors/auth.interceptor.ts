import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { LocalStorageService, getResponseErrorMessage } from '@shared';
import { ToastrService } from 'ngx-toastr';
import { CONSTS, UNKNOWN_ERROR_MESSAGE } from 'app/consts';
import { CustomHttpResponseError, ResponseError } from 'app/model/system/response-error.model';
import { waitForTranslation } from '@shared/utils/translate';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private localStorage: LocalStorageService, private toastService: ToastrService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (req.url.includes('login') || req.url.includes('register')) {
            return next.handle(req);
        }
        const authReq = req.clone({
            headers: req.headers.set('Authorization', 'Bearer ' + this.localStorage.get('user').token)
        });
        return next.handle(authReq).pipe(catchError((event: CustomHttpResponseError) => this.handleErrorResponse(event)));
    }

    private handleErrorResponse(event: CustomHttpResponseError): Observable<HttpEvent<ResponseError>> {
        if ([401, 403].includes(event.status)) {
            this.localStorage.clear();
            this.toastService.error(CONSTS.messages.request_fail);
            setTimeout(() => {
                window.location.href = '/';
            });
        }
        if(event.status == 400){
            event.error.message = getResponseErrorMessage(event.error.message);
        }
        else if(event.status == 500){
            event.error.message = 'system.error.internal-error';
        }
        else event.error.message = UNKNOWN_ERROR_MESSAGE; // when the api hits the other error handlers, we throw the default message
        return throwError(event);
    }
}