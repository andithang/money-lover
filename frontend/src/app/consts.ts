export const CONSTS = {
    page_size: 10,
    page_size_options: [10, 20, 50],
    page_size_get_all: 10000,
    icon_not_selected: 'icon_not_selected.png',
    icon_allow_types: ['png'],
    image_invalid: 'Ảnh không hợp lệ',
    icon_type: '.png',
    select_to_delete_category: 'Vui lòng chọn chủng loại muốn xóa',
    select_to_delete_wallet_type: 'Vui lòng chọn loại ví muốn xóa',
    select_to_delete_icon: 'Vui lòng chọn icon muốn xóa',
    messages: {
        update_category_success: 'Cập nhật chủng loại thành công',
        update_category_fail: 'Cập nhật chủng loại thất bại',
        icon_not_found: 'Không tìm thấy icon',
        insert_category_success: 'Thêm mới chủng loại thành công',
        insert_category_fail: 'Thêm mới chủng loại thất bại',
        delete_category_success: 'Xóa chủng loại thành công',
        delete_category_fail: 'Xóa chủng loại thất bại',
        upload_icon_success: 'Tải lên icon thành công',
        upload_icon_fail: 'Tải lên icon thất bại',
        delete_icon_success: 'Xóa icon thành công',
        delete_icon_fail: 'Xóa icon thất bại',
        update_walettype_success: 'Cập nhật loại ví thành công',
        update_walettype_fail: 'Cập nhật loại ví thất bại',
        insert_walettype_success: 'Thêm mới loại ví thành công',
        insert_walettype_fail: 'Thêm mới loại ví thất bại',
        delete_walettype_success: 'Xóa loại ví thành công',
        delete_walettype_fail: 'Xóa loại ví thất bại',
        request_fail: 'Đã có lỗi xảy ra! Vui lòng đăng nhập lại.',
        register: {
            username_required: 'Vui lòng nhập tên đăng nhập',
            password_required: 'Vui lòng nhập mật khẩu',
            firstname_required: 'Vui lòng nhập họ của bạn',
            lastname_required: 'Vui lòng nhập tên của bạn',
            email_required: 'Vui lòng nhập email',
            username_invalid: 'Tên đăng nhập không đúng định dạng',
            password_invalid: 'Mật khẩu không đúng định dạng',
            firstname_invalid: 'Họ không đúng định dạng',
            lastname_invalid: 'Tên không đúng định dạng',
            email_invalid: 'Email không đúng định dạng',
            confirm_password_inconsistent: 'Mật khẩu xác nhận không trùng khớp',
            confirm_password_required: 'Mật khẩu xác nhận không được để trống'
        },
        create_account_success: 'Đăng ký tài khoản thành công',
        changePassword: {
            required: 'Trường bắt buộc nhập.',
            confirmPassNotMatch: 'Vui lòng xác nhận lại mật khẩu.',
            passwordInvalid: 'Mật khẩu không đúng định dạng.'
        }
    },
    auth: {
        NONE: 'NONE',
        USER: 'USER',
        ADMIN: 'ADMIN',
        SYSTEM: 'SYSTEM'
    },
    transactionType: {
        INCOME: 'Khoản thu',
        OUTCOME: 'Khoản chi'
    },
    months: [
        'Tháng 1',
        'Tháng 2',
        'Tháng 3',
        'Tháng 4',
        'Tháng 5',
        'Tháng 6',
        'Tháng 7',
        'Tháng 8',
        'Tháng 9',
        'Tháng 10',
        'Tháng 11',
        'Tháng 12',
    ]
};

export type Mode = 'view' | 'create' | 'edit';
export type FileExtension = 'jpg' | 'pdf' | 'csv' | 'doc' | 'docx' | 'svg' | 'json' | 'png' | 'ppt' | 'pptx' | 'webm' | 'webp' | 'xls' | 'xlsx'
export type UploadTypeMIME = 'application/msword' | 'text/csv' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'text/html' | 'image/jpeg' | 'application/json' | 'application/vnd.ms-powerpoint' | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'image/svg+xml' | 'video/webm' | 'image/webp' | 'application/vnd.ms-excel' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'application/pdf' | 'image/png'
export type InvalidFile = 'invalid-size' | 'invalid-type' | 'greater-than-min' | 'smaller-than-max' | undefined
export const Annonymous = 'Annonymous';
export const REGEX = {
    EMAIL: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/,
    CURRENCY: /^\$?(([1-9]\d{0,2}(.\d{3})*)|0)?$/,
    PHONE: /(84|0[3|5|7|8|9])+([0-9]{8})\b/,
    NAME: /^[a-zA-Z!@#\$%\^\&*\)\(+=._-]{2,}$/,
    USERNAME: /^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/,
    PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/
};

export function removeAscent (str) {
    if (str === null || str === undefined) return str;
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    return str;
  }

export const NotificationConst = {
    WARNING_LOGIN: 'notify-login',
    CONNECTION_KEY: 'connection_key'
};

export const CloudFrontIconsOrigin = 'https://dml40u9hsdq8f.cloudfront.net/icons/';
export const ReconnectWS = 5000; // 5s
export const UNKNOWN_ERROR_MESSAGE = 'system.error.unknown-message';