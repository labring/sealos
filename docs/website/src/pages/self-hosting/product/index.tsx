import Link from '@docusaurus/Link';
import useWindow from '@site/src/hooks/useWindow';
import CheckIcon from '@site/static/price/check.svg';
import StarIcon from '@site/static/price/star.svg';
import React from 'react';

export default function Product() {
  const { bd_vid } = useWindow();
  const standard = ['工单服务', '应用管理', '高可用数据库', '应用市场', '多租户', '计量/配额'];

  const company = [
    '工单/即时通信服务',
    '周一到周五, 8h 内响应',
    '应用管理',
    '高可用数据库',
    '应用市场',
    '多租户',
    '计量/配额'
  ];

  const contact = [
    '定制化开发与业务云原生化服务',
    '超大规模集群',
    '私有化/离线部署',
    '工单/即时通信/专家对接/现场支持',
    '周一到周日，24h 内响应',
    '应用管理',
    '高可用数据库',
    '应用市场',
    '多租户',
    '计量/配额'
  ];

  return (
    <main className="self-center flex w-full max-w-[1280px] flex-col px-10 z-10">
      <div className="mt-24 text-white text-6xl font-semibold leading-[140%] self-center max-md:text-4xl lg:text-3xl">
        Sealos 私有云
      </div>
      <div className="text-white text-opacity-80 text-center text-xl lg:text-sm font-medium leading-[140%] max-w-[677px] self-center mt-8">
        通过 Sealos 的私有化交付能力一键构建私有云，全面支撑企业各类应用需求
        <br />
        且维护成本极低，仅需半个人力
      </div>
      <div className="flex justify-center mt-14">
        <div
          onClick={() => window.open('https://license.sealos.io/')}
          className="rounded-md cursor-pointer hover:no-underline text-[#FFFFFFCC] hover:text-[#FFFFFFCC] bg-[#B7D8FF26] flex justify-center items-center font-semibold text-lg gap-2 py-3 px-4  lg:text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="21"
            viewBox="0 0 20 21"
            fill="#D9D9D9"
            className="lg:w-4 lg:h-4"
          >
            <mask
              id="mask0_2515_7333"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="24"
              height="25"
            >
              <rect y="0.5" width="24" height="24" />
            </mask>
            <g mask="url(#mask0_2515_7333)">
              <path
                d="M7.70833 18.8333L7.375 16.1666C7.19444 16.0972 7.02431 16.0138 6.86458 15.9166C6.70486 15.8194 6.54861 15.7152 6.39583 15.6041L3.91667 16.6458L1.625 12.6875L3.77083 11.0625C3.75694 10.9652 3.75 10.8715 3.75 10.7812V10.2187C3.75 10.1284 3.75694 10.0347 3.77083 9.93746L1.625 8.31246L3.91667 4.35413L6.39583 5.39579C6.54861 5.28468 6.70833 5.18051 6.875 5.08329C7.04167 4.98607 7.20833 4.90274 7.375 4.83329L7.70833 2.16663H12.2917L12.625 4.83329C12.8056 4.90274 12.9757 4.98607 13.1354 5.08329C13.2951 5.18051 13.4514 5.28468 13.6042 5.39579L16.0833 4.35413L18.375 8.31246L16.2292 9.93746C16.2431 10.0347 16.25 10.1284 16.25 10.2187V10.7812C16.25 10.8715 16.2361 10.9652 16.2083 11.0625L18.3542 12.6875L16.0625 16.6458L13.6042 15.6041C13.4514 15.7152 13.2917 15.8194 13.125 15.9166C12.9583 16.0138 12.7917 16.0972 12.625 16.1666L12.2917 18.8333H7.70833ZM10.0417 13.4166C10.8472 13.4166 11.5347 13.1319 12.1042 12.5625C12.6736 11.993 12.9583 11.3055 12.9583 10.5C12.9583 9.6944 12.6736 9.0069 12.1042 8.43746C11.5347 7.86801 10.8472 7.58329 10.0417 7.58329C9.22222 7.58329 8.53125 7.86801 7.96875 8.43746C7.40625 9.0069 7.125 9.6944 7.125 10.5C7.125 11.3055 7.40625 11.993 7.96875 12.5625C8.53125 13.1319 9.22222 13.4166 10.0417 13.4166ZM10.0417 11.75C9.69444 11.75 9.39931 11.6284 9.15625 11.3854C8.91319 11.1423 8.79167 10.8472 8.79167 10.5C8.79167 10.1527 8.91319 9.8576 9.15625 9.61454C9.39931 9.37149 9.69444 9.24996 10.0417 9.24996C10.3889 9.24996 10.684 9.37149 10.9271 9.61454C11.1701 9.8576 11.2917 10.1527 11.2917 10.5C11.2917 10.8472 11.1701 11.1423 10.9271 11.3854C10.684 11.6284 10.3889 11.75 10.0417 11.75ZM9.16667 17.1666H10.8125L11.1042 14.9583C11.5347 14.8472 11.934 14.684 12.3021 14.4687C12.6701 14.2534 13.0069 13.993 13.3125 13.6875L15.375 14.5416L16.1875 13.125L14.3958 11.7708C14.4653 11.5763 14.5139 11.3715 14.5417 11.1562C14.5694 10.9409 14.5833 10.7222 14.5833 10.5C14.5833 10.2777 14.5694 10.059 14.5417 9.84371C14.5139 9.62843 14.4653 9.42357 14.3958 9.22913L16.1875 7.87496L15.375 6.45829L13.3125 7.33329C13.0069 7.01385 12.6701 6.74649 12.3021 6.53121C11.934 6.31593 11.5347 6.15274 11.1042 6.04163L10.8333 3.83329H9.1875L8.89583 6.04163C8.46528 6.15274 8.06597 6.31593 7.69792 6.53121C7.32986 6.74649 6.99306 7.0069 6.6875 7.31246L4.625 6.45829L3.8125 7.87496L5.60417 9.20829C5.53472 9.41663 5.48611 9.62496 5.45833 9.83329C5.43056 10.0416 5.41667 10.2638 5.41667 10.5C5.41667 10.7222 5.43056 10.9375 5.45833 11.1458C5.48611 11.3541 5.53472 11.5625 5.60417 11.7708L3.8125 13.125L4.625 14.5416L6.6875 13.6666C6.99306 13.9861 7.32986 14.2534 7.69792 14.4687C8.06597 14.684 8.46528 14.8472 8.89583 14.9583L9.16667 17.1666Z"
                fill="white"
                fillOpacity="0.8"
              />
            </g>
          </svg>
          管理私有云
        </div>
      </div>

      <div className="flex justify-center mt-24 gap-9 flex-wrap">
        <div className="flex min-h-[840px] max-w-[460px] lg:min-h-[540px] flex-col pt-10 px-12 rounded-lg border border-opacity-5 border-white bg-opacity-5 bg-white flex-1">
          <div className="text-[#7BBCF9] text-2xl lg:text-base font-semibold leading-[140%]">
            标准版
          </div>
          <div className="text-white text-opacity-80 text-[28px] lg:text-sm font-medium leading-[140%] mt-8">
            适合开发者测试， POC demo，企业生产环境
          </div>
          <div
            className="sealos_price_btn"
            style={{
              backgroundColor: '#8EBAEE',
              color: '#03080C'
            }}
            onClick={() =>
              window.open(`https://license.sealos.io/signin?external=true&bd_vid=${bd_vid}`)
            }
          >
            获取
          </div>
          <div className="sealos_divid_line"></div>
          <div className="sealos_service_item">
            <StarIcon />
            <span style={{ color: '#8EBAEE' }}>私有化/离线部署</span>
          </div>
          {company.map((i) => (
            <div key={i} className="sealos_service_item">
              <CheckIcon />
              <span>{i}</span>
            </div>
          ))}
        </div>
        <div className="flex min-h-[840px] max-w-[460px] lg:min-h-[540px] flex-col pt-10 px-12 rounded-lg border border-opacity-5 border-white bg-opacity-5 bg-white flex-1">
          <div className="text-teal-200 text-2xl lg:text-base font-semibold leading-[140%]">
            定制版
          </div>
          <div className="text-white text-opacity-80 text-[28px] font-medium leading-[140%] mt-10 w-[200px] h-20">
            适合大规模集群
            <br />
            与大型企业客户
          </div>
          <div
            className="sealos_price_btn contact"
            style={{ marginTop: '32px' }}
            onClick={() =>
              window.open(
                'https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad'
              )
            }
          >
            联系我们
          </div>
          <div className="sealos_divid_line"></div>
          {contact.map((i) => (
            <div key={i} className="sealos_service_item">
              <CheckIcon />
              <span>{i}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
