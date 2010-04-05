$KCODE = "u"
require 'sinatra'
require 'dm-core'
require 'haml'
require 'amazon'

# Set Haml output format and enable escapes
set :haml, {:format => :html5}

get '/' do
  haml :index
end

get '/search' do
  @keyword = params['keyword']
  if params['category'] == 'Auto'
    @category = select_category(@keyword)
  end
  haml :search
end

def select_category(keyword)
  group = "SalesRank,ItemAttributes"
  body = Amazon::Request.new.fetch({ :Operation     => "ItemSearch",
                                     :Keywords      => keyword,
                                     :ItemPage      => 1,
                                     :ResponseGroup => group,
                                     :Sort          => "salesrank" })
  response = XMLObject.new(body)
  ## TODO: count category
end

#
# Search API
# format: xml/yaml/json
#
get '/search/:category/:keyword/:page/:format' do
  keyword = params[:keyword] + " "
  group = "SalesRank,Offers,OfferSummary,ItemAttributes,Images,Reviews"
  body = Amazon::Request.new.fetch({ :Operation     => "ItemSearch",
                                     :SearchIndex   => params[:category],
                                     :Keywords      => keyword,
                                     :ItemPage      => params[:page],
                                     :ResponseGroup => group,
                                     :Sort          => "salesrank" })
  case params[:format]
  when "xml"
    content_type "text/xml"
    body
  when "yaml"
    content_type "text"
    Hash.from_xml(body).to_yaml
  when "json"
    content_type "application/json"
    Hash.from_xml(body).to_json
  end
end

get '/search/:category/:keyword' do
  content_type :text
  products = Amazon::Products.new
  products.search(params[:category], params[:keyword])
  products.to_pretty
end

## Product Advertising API Developer Guide (API Version 2009-11-01)
## - http://docs.amazonwebservices.com/AWSECommerceService/2009-11-01/DG/
