import { Directive, ElementRef, ViewContainerRef, Input, OnChanges, SimpleChanges, TemplateRef } from '@angular/core';
import { AuthorizationService } from '@shared/services/authorization.service';

@Directive({ selector: '[accessCheck]' })
export class AccessCheckerDirective implements OnChanges {
    constructor(private authorService: AuthorizationService, private viewContainerRef: ViewContainerRef, private templateRef: TemplateRef<HTMLElement>) { 
        this.authorService.allowActionsReady$.subscribe(isReady => {
            if(isReady) {
                if(this.waitingForReady) {
                    this.checkAuthorized();
                    this.waitingForReady = false;
                }
            }
        })
    }
    
    ngOnChanges(changes: SimpleChanges): void {        
        if(changes['accessCheckRenderFinished'] && this.accessCheckRenderFinished) {
            if(this.authorReady) {
                this.checkAuthorized();
            } else {
                this.waitingForReady = true;
            }
        }
    }

    @Input() accessCheckRenderFinished: boolean = false;
    @Input() accessCheck: string = '';

    private authorReady: boolean = false;
    private waitingForReady: boolean = false;

    private checkAuthorized() {
        if(!this.authorService.isAuthorized(this.accessCheck)) {
            this.viewContainerRef.clear()
        } else this.viewContainerRef.createEmbeddedView(this.templateRef)
    }

}