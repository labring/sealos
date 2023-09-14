export interface License {
  _id: string;
  uid: string;
  meta: {
    token: string;
    createTime: string; // 激活时间
  };

  payload: {
    iss: string;
    iat: Date; // 签发日期
    exp: Date; // 有效期
    amt: number; // 额度
  };
}

export type LicenseCollection = {
  uid: string;
  license: License[];
};
