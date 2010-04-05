require 'appengine-apis/urlfetch'
require 'hmac/sha2'
require 'base64'
require 'rexml/document'
require 'config-amazon'
require 'xml-object' ## http://xml-object.rubyforge.org/
require 'pp'
require 'json'

module Amazon
  class Image
    def initialize(url, width, height)
      @url = url
      @width = width
      @height = height
    end

    def to_hash
      {
        :url    => @url,
        :width  => @width,
        :height => @height
      }
    end
  end

  class Product
    def initialize(item)
      @item = item
    end

    def to_hash
      {
        :title        => title,
        :price        => price,
        :sales_rank   => sales_rank,
        :small_image  => small_image.to_hash,
        :medium_image => medium_image.to_hash,
        :large_image  => large_image.to_hash
      }
    end

    def title
      @item.ItemAttributes.Title
    end

    def detail_page_url
      @item.DetailPageURL
    end

    def small_image
      Image.new(@item.SmallImage.URL,
                @item.SmallImage.Height.to_i,
                @item.SmallImage.Width.to_i)
    rescue
      nil
    end

    def medium_image
      Image.new(@item.MediumImage.URL,
                @item.MediumImage.Height.to_i,
                @item.MediumImage.Width.to_i)
    end

    def large_image
      Image.new(@item.LargeImage.URL,
                @item.LargeImage.Height.to_i,
                @item.LargeImage.Width.to_i)
    end

    def price
      @item.ItemAttributes.ListPrice.Amount rescue nil
    end

    def sales_rank
      @item.SalesRank.to_i rescue nil
    end
  end

  #
  # Search Products
  # 必要な値を取り出す。適当にソート。
  #
  class Products < Array
    def search(category, keyword)
      response = fetch(category, keyword, 1)
      add_items(response.Items)

      total_pages = response.Items.TotalPages.to_i
      if total_pages > 1 then
        if total_pages > 10
          total_pages = 10
        end
        Range.new(2, total_pages).each {|page|
          puts "== page: #{page}"
          response = fetch(category, keyword, page)
          add_items(response.Items)
        }
      end
    end

    def to_json
      JSON.generate(self.to_a)
    end

    def to_pretty
      JSON.pretty_generate(self.to_a)
    end

    def to_a
      self.map {|product|
        if product then
          product.to_hash
        end
      }
    end

    def add_items(items)
      items.Items.each {|item|
        push(Product.new(item))
      }
    end

    #
    # @return [XMLObject]
    #
    def fetch(category, keyword, page)
      body = Request.new.fetch({ :Operation => "ItemSearch",
                                 :SearchIndex => category,
                                 :Keywords => keyword,
                                 :ItemPage => page,
                                 :ResponseGroup => "Small,SalesRank,ItemAttributes,Images",
                                 :Sort => "salesrank" })
      response = XMLObject.new(body)
      if err = response.Error rescue nil then
        warn err.Message
        raise(err.Message)
      end
      response
    end
  end

  ##
  ## Make URL for request, and Fetch
  ##

  class Request
    def fetch(params)
      url = make_url(params)
      AppEngine::URLFetch.fetch(url).body
    end

    def make_url(params)
      hostname = "ecs.amazonaws.jp"
      path = "/onca/xml"
      params_str = format_params(params)
      sig = sign([ "GET",
                   hostname,
                   path,
                   params_str
                 ].join("\n"))
      "http://#{hostname}#{path}?#{params_str}&Signature=#{ rfc3986_escape(sig) }"
    end

    def format_params(params)
      params[:Service] = "AWSECommerceService"
      params[:Version] = "2009-03-31"
      params[:AWSAccessKeyId] = ConfigAmazon::ACCESS_KEY
      params[:Timestamp] = Time.now.getutc.strftime("%Y-%m-%dT%H:%M:%SZ")
      params.map {|k, v|
        [ k.to_s, rfc3986_escape(v.to_s) ].join("=")
      }.sort.join("&")
    end

    def sign(str)
      digest = HMAC::SHA256.digest(ConfigAmazon::SECRET_KEY, str)
      Base64.encode64(digest).chomp
    end

    def rfc3986_escape(str)
      safe_char = Regexp.new(/[A-Za-z0-9\-_.~]/)
      encoded = ""
      str.each_byte{|chr|
        if safe_char =~ chr.chr
          encoded = encoded + chr.chr
        else
          encoded = encoded + "%" + chr.chr.unpack("H*")[0].upcase
        end
      }
      return encoded
    end
  end
end

## SearchIndex-ItemSearch Parameter Combination JP
## - http://docs.amazonwebservices.com/AWSECommerceService/latest/DG/index.html?JPSearchIndexParamForItemsearch.html
## - Books, Electronics...
