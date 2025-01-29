import { TranslateService } from '@ngx-translate/core';
import { filter, take } from 'rxjs';

export const waitForTranslation = (translate: TranslateService) => {
  return translate.getTranslation(translate.currentLang).pipe(filter(lang => Object.keys(lang).length > 0), take(1));
};