import { AbstractControl } from '@angular/forms';
import { FileExtension, UploadTypeMIME } from 'app/consts';

/**
 * 序列化 JSON，同时转义，删除两边空格
 */
export function serialize(obj = {}) {
  const arr = [];
  for (const k of Object.keys(obj)) {
    arr.push(
      `${k}=${encodeURIComponent(
        typeof obj[k] === 'string'
          ? String.prototype.trim.call(obj[k])
          : obj[k] === null
            ? ''
            : obj[k]
      )}`
    );
  }
  return arr.join('&');
}

/**
 * 删除 null | undefined | ''
 */
export function delEmptyKey(obj: object) {
  const objCpy = {};
  if (obj === null || obj === undefined) {
    return objCpy;
  }
  for (const key in obj) {
    if (obj[key] !== null && typeof obj[key] === 'object') {
      objCpy[key] = delEmptyKey(obj[key]);
    } else if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      objCpy[key] = obj[key];
    }
  }
  return objCpy;
}

/**
 * 判断是否是空对象
 */
export function isEmptyObject(obj: object) {
  let name: any;
  // tslint:disable-next-line: forin
  for (name in obj) {
    return false;
  }
  return true;
}

/**
 * 判断是否是合法的日期对象
 */
export function isValidDate(date: Date) {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 将对象转为字符串
 */
export function obj2Str(obj: any) {
  const p = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] || obj[key] === 0) {
      if (obj[key].toString() !== '') {
        // 空数组排除
        p[key] = obj[key].toString();
      }
    }
  }
  return p;
}

/**
 * 去除字符串回车换行空白并转换成数组
 */
export function str2arr(str: string) {
  return str.replace(/[\r\n\s]/g, '').split(',');
}

/**
 * 获取滚动条的宽度
 */
export function getScrollbarWidth() {
  const scrollDiv = document.createElement('div');
  scrollDiv.style.cssText =
    'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
  document.body.appendChild(scrollDiv);
  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);

  return scrollbarWidth;
}

/**
 * number to dollar format
 */
export function numberToCurrency(txt: number) {
  const formatWithSuffix = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(txt);
  return formatWithSuffix.substring(0, formatWithSuffix.length - 2);
}

/**
 * string number to VNese format
 */
export function formatNumber(s:string):string {
  const n = parseInt(s.toString().replace(/\D/g, '')); // in case s is not a string
  return isNaN(n) ? '' : n.toLocaleString('vi-VN');
}

export function currencyToNumber(txt: string) {
  return parseInt(txt.split('.').join(''));
}

/**
 * return the string of a number in a specific type and format
 * @param num value of the number to format
 * @param format type of format, date or time
 * @returns 
 */
export function numberDisplay(
  num: number,
  format: 'date' | 'time' = 'date'
): string {
  switch (format) {
    case 'time': {
      if (num < 10) {
        return `0${num}`;
      }
      else {
        return num.toString();
      }
    }
    default: {
      if(num < 10){
        return `0${num}`;
      }
      else {
        return num.toString();
      }
    }
  }
}

export function randomString(isRandomLength: boolean = true, setLength?: number) {
  let length = Math.round(Math.random()*20);
  if(!isRandomLength){
    length = setLength;
  }
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

/**
 * mapping file extension with MIME types
 */
export function mapMIMEType(fileExts: FileExtension[]): UploadTypeMIME[]{
  const output: UploadTypeMIME[] = [];
  fileExts.forEach(ext => {
    switch(ext){
      case 'csv': {
        output.push('text/csv');
        break;
      }
      case 'doc': {
        output.push('application/msword');
        break;
      }
      case 'docx': {
        output.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        break;
      }
      case 'jpg': {
        output.push('image/jpeg');
        break;
      }
      case 'json': {
        output.push('application/json');
        break;
      }
      case 'pdf': {
        output.push('application/pdf');
        break;
      }
      case 'png': {
        output.push('image/png');
        break;
      }
      case 'ppt': {
        output.push('application/vnd.ms-powerpoint');
        break;
      }
      case 'pptx': {
        output.push('application/vnd.openxmlformats-officedocument.presentationml.presentation');
        break;
      }
      case 'svg': {
        output.push('image/svg+xml');
        break;
      }
      case 'webm': {
        output.push('video/webm');
        break;
      }
      case 'webp': {
        output.push('image/webp');
        break;
      }
      case 'xls': {
        output.push('application/vnd.ms-excel');
        break;
      }
      case 'xlsx': {
        output.push('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        break;
      }
      default: {
        break;
      }
    }
  });
  return output;
}

// exchange input size in string to bytes
export function exchangeToByte(sizeStr: string){
  const lowerCase = sizeStr.toLowerCase();
  const unit = lowerCase.substring(lowerCase.length-2, lowerCase.length);
  const size = Number(lowerCase.substring(0, lowerCase.length-2));
  switch(unit){
    case 'kb': {
      return 1024*size;
    }
    case 'mb': {
      return 1024*1024*size;
    }
    case 'gb': {
      return 1024*1024*1024*size;
    }
    default: {
      return size;
    }
  }

}

export function getResponseErrorMessage(message: string){
  switch (message) {
    case 'ERROR_USER_LOCK':
      return 'Người dùng đã bị khóa. Vui lòng thử lại.'; 
    case 'ERROR_PASSWORD_INCORRECT':
      return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.'; 
    case 'ERROR_QUESTION_NOT_FOUND':
      return 'Không tìm thấy câu hỏi.'; 
    case 'ERROR_QUESTION_CONTENT_MISSING':
      return 'Nội dung câu hỏi là bắt buộc.'; 
    case 'ERROR_QUESTION_EXIST':
      return 'Câu hỏi với mã này đã tồn tại.'; 
    case 'ERROR_ID_MISSING':
      return 'Thiếu trường _id.'; 
    case 'ERROR_QUESTION_CANNOT_BE_MODIFIED':
      return 'Câu hỏi không thể bị ghi đè.'; 
    case 'ERROR_MISSING_QUESTIONS':
      return 'Thiếu danh sách câu hỏi.';
    case 'ERROR_DELETE_OLD_USER_QUESTION':
      return 'Xóa danh sách câu hỏi cũ của người dùng thất bại.';
    case 'ERROR_DEL_WHEN_INSERT_USER_QUESTION':
      return 'Xoá liên kết cũ người dùng với câu hỏi bảo mật thât bại.';
    case 'ERROR_INSERT_USER_QUESTION':
      return 'Liên kết người dùng với câu hỏi bảo mật thât bại.';
    case 'ERROR_AUTH_USER_QUESTION':
      return 'Xác thực người dùng thất bại.';
    case 'ERROR_USER_NOT_SET_QUESTIONS':
      return 'Người dùng chưa cài đặt câu hỏi bảo mật.';
    case 'ERROR_CANNOT_FIND_USER':
      return 'Lỗi lấy thông tin người dùng.';
    case 'ERROR_CANNOT_UPDATE_USER':
      return 'Lỗi cập nhật thông tin người dùng.';
    case 'ERROR_URL_INVALID':
      return 'Đường dẫn không hợp lệ.';
    case 'ERROR_KEY_EXPIRED':
      return 'Khóa hết hạn. Vui lòng thử lại.';
    case 'ERROR_EMAIL_MISSING':
      return 'Email không hợp lệ. Vui lòng thử lại.';
    case 'ERROR_USERNAME_MISSING':
      return 'Tên đăng nhập không hợp lệ. Vui lòng thử lại.';
    case 'ERROR_FIRSTNAME_MISSING':
      return 'Tên họ không được để trống.';
    case 'ERROR_LASTNAME_MISSING':
      return 'Tên của bạn không được để trống.';
    case 'ERROR_MOBILE_MISSING':
      return 'Số điện thoại không hợp lệ.';
    case 'ERROR_ERROR_FIND_USER_EMAIL_EXIST':
      return 'Có lỗi xảy ra. Vui lòng thử lại';
    case 'ERROR_REDIS_KEY_NOT_EXIST':
      return 'Có lỗi xảy ra. Vui lòng thử lại.';
    case 'ERROR_REDIS_GET_KEY':
      return 'Có lỗi xảy ra. Vui lòng thử lại.';
    case 'ERROR_OTP_INVALID':
      return 'Mã OTP không hợp lệ. Vui lòng thử lại.';
    case 'ERROR_REDIS_GET_KEY_USER':
    case 'ERROR_REDIS':
      return 'Có lỗi xảy ra. Vui lòng thử lại.';
    case 'ERROR_MAX_COUNT_INVALID_OTP':
      return 'Số lần nhập OTP đã hết. Đăng nhập thất bại';
    case 'ERROR_OTP_INCORRECT':
      return 'Mã OTP không hợp lệ. Vui lòng thử lại.';
    case 'ERROR_FIND_USER': 
      return 'Không tìm thấy người dùng.';
    case 'ERROR_USER_BEING_CHANGE_PASSWORD': 
      return 'User đang được thay mật khẩu. Nếu đó không phải bạn, vui lòng liên hệ ngay quản trị viên để được hỗ trợ sớm nhất.';
    case 'ERROR_TOKEN_NOT_MATCH': 
      return 'Token đổi mật khẩu không khớp.';
    case 'ERROR_CONFIRM_PASS_NOT_MATCH': 
      return 'Vui lòng xác nhận lại mật khẩu.';
    case 'ERROR_SAVE_USER': 
      return 'Không thể lưu người dùng.';
    case 'ERROR_OLDPASSWORD_INCORRECT': 
      return 'Mật khẩu cũ không đúng.';
    case 'ERROR_SAVE_REDIS_FORGOT_PASSWORD': 
      return 'Hệ thống xảy ra lỗi. Vui lòng thử lại sau ít phút.';
    case 'ERROR_SENT_MAIL_FORGOT_PASSWORD': 
      return 'Đã xảy ra lỗi khi gửi email. Vui lòng thử lại sau ít phút.';
    case 'ERROR_SELF_RESET_PASSWORD': 
      return 'Bạn không thể tự reset password của chính mình.';
    case 'ERROR_DEL_CURR_USER': 
      return 'Bạn không thể tự xóa tài khoản của chính mình.';
    case 'ERROR_NOT_ALL_DEL_TEMP': 
      return 'Không thể xóa vĩnh viễn các tài khoản đang hoạt động.';
    case 'ERROR_ROLE_CODE_MISSING':
      return 'Thiếu dữ liệu truyền lên về mã vai trò.';
    case 'ERROR_ROLE_NOT_FOUND':
      return 'Không tìm thấy vai trò.';
    case 'ERROR_TITLE_MISSING':
      return 'Thiếu dữ liệu truyền lên về tên.';
    case 'ERROR_ROLE_EXIST':
      return 'Vai trò với mã này đã tồn tại. Vui lòng thử lại.';
    case 'ERROR_CODE_MISSING':
      return 'Thiếu dữ liệu truyền lên về mã.';
    case 'ERROR_DESCRIPTION_MISSING':
      return 'Thiếu dữ liệu truyền lên về mô tả.';
    case 'ERROR_STATUS_INVALID':
      return 'Truyền tham số về trạng thái không hợp lệ.';
    case 'ERROR_ACTION_TITLE_MISSING':
      return 'Thiếu dữ liệu truyền lên về tên hành động.';
    case 'ERROR_ACTION_NOT_FOUND':
      return 'Không tìm thấy hành động trên hệ thống.';
    case 'ERROR_ACTION_CODE_MISSING':
      return 'Thiếu dữ liệu truyền lên về mã hành động.';
    case 'ERROR_ACTION_EXIST':
      return 'Hành động với mã này đã tồn tại trên hệ thống.';
    case 'ERROR_ACTION_DESCRIPTION_MISSING':
      return 'Thiếu dữ liệu truyền lên về mô tả hành động.';
    case 'ERROR_MODULE_TITLE_MISSING':
      return 'Thiếu dữ liệu truyền lên về tên module';
    case 'ERROR_MODULE_NOT_FOUND':
      return 'Không thể tìm thấy module trên hệ thống.';
    case 'ERROR_MODULE_CODE_MISSING': 
      return 'Thiếu dữ liệu truyền lên về mã module.';
    case 'ERROR_MODULE_EXIST': 
      return 'Module với mã này đã tồn tại trên hệ thống.';
    case 'ERROR_MODULE_DESCRIPTION_MISSING': 
      return 'Thiếu dữ liệu truyền lên về mô tả module.';
    case 'ERROR_PERMISSION_TITLE_MISSING': 
      return 'Thiếu dữ liệu truyền lên về tên quyền.';
    case 'ERROR_PERMISSION_NOT_FOUND': 
      return 'Không tìm thấy quyền trên hệ thống.';
    case 'ERROR_PERMISSION_CODE_MISSING': 
      return 'Thiếu dữ liệu truyền lên về mã quyền.';
    case 'ERROR_PERMISSION_EXIST': 
      return 'Quyền với mã này đã tồn tại trên hệ thống.';
    case 'ERROR_PERMISSION_DESCRIPTION_MISSING': 
      return 'Thiếu dữ liệu truyền lên về mô tả quyền.';
    case 'ERROR_PERMISSION_ROLE_MISSING': 
      return 'Thiếu dữ liệu truyền lên về vai trò người dùng bị ảnh hưởng.';
    case 'ERROR_PERMISSION_ALLOW_MISSING': 
      return 'Thiếu dữ liệu truyền lên về loại ảnh hưởng (Cho phép hay từ chối truy cập).';
    case 'ERROR_PERMISSION_MODULE_ACTION_MISSING': 
      return 'Thiếu dữ liệu truyền lên về các hành động được thực hiện trên 1 module.';
    case 'ERROR_NOT_A_NUMBER': 
      return 'Tham số truyền lên không phải là số. Vui lòng thử lại.';
    case 'ERRROR_EMAIL_EXIST': 
      return 'Email đã được sử dụng. Vui lòng sử dụng một email khác.';
    case 'UNAUTHORIZED':
      return 'my-ml.common.unauthorized';
    default:
      return message;
  }
}

export const trim = (control: AbstractControl) => {
  if(control) control.setValue(control.value ? control.value.trim(): '');
};

export const checkIsCheckAll = (ids: string[], items: Partial<{_id: string}>[]) => {
  let isAllChecked: boolean = true;
  for (let index = 0; index < items.length; index++) {
    if(!ids.includes(items[index]._id)) {
      isAllChecked = false;
      break;
    }
  }
  return isAllChecked;
};