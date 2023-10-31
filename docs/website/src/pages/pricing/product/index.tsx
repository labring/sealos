import CheckIcon from '@site/static/price/check.svg';
import StarIcon from '@site/static/price/star.svg';
import React from 'react';

export default function Product() {
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
    <main className="self-center flex w-full max-w-[1280px] flex-col px-10">
      <div className="mt-24 text-white text-6xl font-semibold leading-[140%] self-center max-md:text-4xl lg:text-3xl">
        Sealos 私有云
      </div>
      <div className="text-white text-opacity-80 text-center text-xl lg:text-sm font-medium leading-[140%] max-w-[677px] self-center mt-8">
        通过 Sealos 的私有化交付能力一键构建私有云，全面支撑企业各类应用需求
        <br />
        且维护成本极低，仅需半个人力
      </div>

      <div className="flex mt-24 gap-9 flex-wrap">
        <div className="flex min-h-[840px] lg:min-h-[540px] flex-col pt-10 px-12 rounded-lg border border-opacity-5 border-white bg-opacity-5 bg-white flex-1">
          <div className="text-teal-200 text-2xl lg:text-base font-semibold leading-[140%]">
            标准版
          </div>
          <div className="flex mt-4">
            <div className="text-white text-5xl lg:text-4xl font-semibold leading-[140%] self-stretch max-md:text-4xl">
              ¥0
            </div>
            <div className="bg-[#00A9B41A] ml-6 flex items-center justify-center w-32 max-w-full flex-col my-auto rounded-bl-none rounded-2xl py-1 text-white text-xl lg:text-base font-medium leading-[140%]">
              赠 ¥299
            </div>
          </div>
          <div className="text-white text-opacity-80 text-lg lg:text-sm font-semibold leading-[140%] mt-4">
            适合开发者测试，或 POC demo
          </div>
          <div
            className="sealos_price_btn"
            onClick={() =>
              window.open(
                'https://license.sealos.io/pricing?external=true&clusterType=Standard',
                '_black'
              )
            }
          >
            一键安装
          </div>
          <div className="sealos_divid_line"></div>
          {standard.map((i) => (
            <div key={i} className="sealos_service_item">
              <CheckIcon />
              <span>{i}</span>
            </div>
          ))}
        </div>
        <div className="flex min-h-[840px] lg:min-h-[540px] flex-col pt-10 px-12 rounded-lg border border-opacity-5 border-white bg-opacity-5 bg-white flex-1">
          <div className="text-[#7BBCF9] text-2xl lg:text-base font-semibold leading-[140%]">
            企业版
          </div>
          <div className="flex mt-4">
            <div className="text-white text-5xl lg:text-4xl font-semibold leading-[140%] self-stretch max-md:text-4xl">
              ¥599
            </div>
            <div className="bg-[#366BA94D] ml-6 flex items-center justify-center w-32 max-w-full flex-col my-auto rounded-bl-none rounded-2xl py-1 text-white text-xl lg:text-base font-medium leading-[140%]">
              赠 ¥599
            </div>
          </div>
          <div className="text-white text-opacity-80 text-lg lg:text-sm font-semibold leading-[140%] mt-4">
            适合企业生产环境
          </div>
          <div
            className="sealos_price_btn"
            style={{
              backgroundColor: '#8EBAEE',
              color: '#03080C'
            }}
            onClick={() =>
              window.open(
                'https://license.sealos.io/pricing?external=true&clusterType=Enterprise',
                '_black'
              )
            }
          >
            购买
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
        <div className="flex min-h-[840px] lg:min-h-[540px] flex-col pt-10 px-12 rounded-lg border border-opacity-5 border-white bg-opacity-5 bg-white flex-1">
          <div className="text-teal-200 text-2xl lg:text-base font-semibold leading-[140%]">
            定制版
          </div>
          <div className="text-white text-opacity-80 text-2xl font-semibold leading-[140%] mt-10 w-[200px] h-20">
            适合大规模集群
            <br />
            与大型企业客户
          </div>
          <div
            className="sealos_price_btn contact"
            style={{ marginTop: '46px' }}
            onClick={() =>
              window.open(
                'https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad',
                '_black'
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
