import { NextApiRequest, NextApiResponse } from "next";
import { jsonRes } from "@/services/backend/response";

import { queryUser } from "@/services/backend/db/user";
import { hashPassword } from "@/utils/crypto";
import { TUserExist } from "@/types/user";
import { enablePassword } from "@/services/enable";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if(!enablePassword()) {
            console.log(process.env.PASSWORD_SALT, process.env.PASSWORD_ENABLED)
            throw new Error('PASSWORD_SALT is not defined')
        }
        const { user } = req.body;

        const result = await queryUser({ id: user, provider: 'password_user' })
        if (!result || !result.password || result.password === hashPassword('')) {
            return jsonRes<TUserExist>(res, {
                message: 'not found',
                code: 404,
                data: {
                    user,
                    exist: false
                }
            })
        }
        return jsonRes<TUserExist>(res, {
            code: 200,
            message: 'Successfully',
            data: {
                user,
                exist: true
            }
        })
    } catch (err) {
        console.log(err)
        return jsonRes(res, {
            message: 'Failed to get result',
            code: 500,
        })
    }
}
